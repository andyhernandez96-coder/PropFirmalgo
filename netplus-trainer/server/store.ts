import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { questionHash } from '../shared/hash';
import { bankHashes, classifyBatch, toQuestion } from '../shared/importer';
import {
  type Progress,
  ProgressSchema,
  type Question,
  QuestionSchema,
  type Session,
  SessionSchema,
} from '../shared/schema';

const here = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = path.resolve(here, '..');
export const DATA_DIR = path.resolve(process.env.NETPLUS_DATA_DIR ?? path.join(APP_ROOT, 'data'));
export const INBOX_DIR = path.join(DATA_DIR, 'inbox');
export const PROCESSED_DIR = path.join(INBOX_DIR, 'processed');
export const FAILED_DIR = path.join(INBOX_DIR, 'failed');
const SEED_FILE = path.join(APP_ROOT, 'seed', 'seed-questions.json');

const FILES = {
  questions: path.join(DATA_DIR, 'questions.json'),
  progress: path.join(DATA_DIR, 'progress.json'),
  sessions: path.join(DATA_DIR, 'sessions.json'),
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Windows antivirus or indexers can hold a file for a moment; retry instead of failing. */
export async function renameWithRetry(from: string, to: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.rename(from, to);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (attempt >= 8 || !['EPERM', 'EBUSY', 'EACCES'].includes(code ?? '')) throw err;
      await sleep(50 * (attempt + 1));
    }
  }
}

let tmpCounter = 0;

/** Write to a temp file, flush it to disk, then rename over the target. */
export async function writeFileAtomic(file: string, text: string): Promise<void> {
  const tmp = `${file}.${process.pid}.${++tmpCounter}.tmp`;
  const handle = await fs.open(tmp, 'w');
  try {
    await handle.writeFile(text, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await renameWithRetry(tmp, file);
  } catch (err) {
    await fs.rm(tmp, { force: true });
    throw err;
  }
}

/** One write queue per file so two saves never interleave. */
class WriteQueue {
  private tail: Promise<void> = Promise.resolve();
  enqueue(file: string, data: unknown): Promise<void> {
    const text = JSON.stringify(data, null, 2);
    const run = this.tail.then(() => writeFileAtomic(file, text));
    this.tail = run.catch((err) => console.error(`[store] could not write ${file}:`, err));
    return run;
  }
}

async function readJson(file: string): Promise<{ status: 'missing' } | { status: 'ok'; value: unknown } | { status: 'corrupt' }> {
  let text: string;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { status: 'missing' };
    throw err;
  }
  try {
    return { status: 'ok', value: JSON.parse(text.replace(/^﻿/, '')) };
  } catch {
    return { status: 'corrupt' };
  }
}

/** Keeps an unreadable file aside instead of overwriting it, so nothing is lost silently. */
async function quarantine(file: string): Promise<void> {
  const aside = `${file}.corrupt-${Date.now()}`;
  await renameWithRetry(file, aside);
  console.warn(`[store] ${path.basename(file)} could not be read. It was kept as ${aside} and a new empty file was started.`);
}

function validItems<T>(raw: unknown, schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } }, label: string): T[] {
  if (!Array.isArray(raw)) {
    console.warn(`[store] ${label} is not a list; starting empty.`);
    return [];
  }
  const out: T[] = [];
  raw.forEach((item, i) => {
    const r = schema.safeParse(item);
    if (r.success) out.push(r.data);
    else console.warn(`[store] skipped invalid ${label} item #${i}`);
  });
  return out;
}

export interface ImportResult {
  imported: number;
  duplicates: number;
  invalid: { index: number; errors: string[] }[];
}

export class Store {
  questions: Question[] = [];
  progress: Progress = { attempts: [], leitner: {} };
  sessions: Session[] = [];
  private queues = { questions: new WriteQueue(), progress: new WriteQueue(), sessions: new WriteQueue() };

  async init(): Promise<void> {
    for (const dir of [DATA_DIR, INBOX_DIR, PROCESSED_DIR, FAILED_DIR]) await fs.mkdir(dir, { recursive: true });

    const q = await readJson(FILES.questions);
    if (q.status === 'missing') {
      const seed = JSON.parse(await fs.readFile(SEED_FILE, 'utf8')) as unknown[];
      this.questions = classifyBatch(seed, new Set()).flatMap((r) => (r.status === 'valid' ? [r.question] : []));
      await this.saveQuestions();
      console.log(`[store] first run: loaded ${this.questions.length} seed questions`);
    } else {
      if (q.status === 'corrupt') await quarantine(FILES.questions);
      this.questions = q.status === 'ok' ? validItems(q.value, QuestionSchema, 'question') : [];
      if (q.status === 'corrupt') await this.saveQuestions();
    }

    const p = await readJson(FILES.progress);
    if (p.status === 'ok') {
      const parsed = ProgressSchema.safeParse(p.value);
      if (parsed.success) this.progress = parsed.data;
      else {
        await quarantine(FILES.progress);
        await this.saveProgress();
      }
    } else {
      if (p.status === 'corrupt') await quarantine(FILES.progress);
      await this.saveProgress();
    }

    const s = await readJson(FILES.sessions);
    if (s.status === 'corrupt') await quarantine(FILES.sessions);
    this.sessions = s.status === 'ok' ? validItems(s.value, SessionSchema, 'session') : [];
    if (s.status !== 'ok') await this.saveSessions();
  }

  saveQuestions() {
    return this.queues.questions.enqueue(FILES.questions, this.questions);
  }
  saveProgress() {
    return this.queues.progress.enqueue(FILES.progress, this.progress);
  }
  saveSessions() {
    return this.queues.sessions.enqueue(FILES.sessions, this.sessions);
  }

  async importQuestions(raws: unknown[], defaultSource?: string): Promise<ImportResult> {
    const withSource = defaultSource
      ? raws.map((r) => (r && typeof r === 'object' && !Array.isArray(r) && !('source' in r) ? { ...r, source: defaultSource } : r))
      : raws;
    const results = classifyBatch(withSource, bankHashes(this.questions));
    const result: ImportResult = { imported: 0, duplicates: 0, invalid: [] };
    results.forEach((r, index) => {
      if (r.status === 'valid') {
        this.questions.push(r.question);
        result.imported++;
      } else if (r.status === 'duplicate') result.duplicates++;
      else result.invalid.push({ index, errors: r.errors });
    });
    if (result.imported > 0) await this.saveQuestions();
    return result;
  }

  async updateQuestion(
    id: string,
    raw: unknown,
  ): Promise<{ ok: true; question: Question } | { ok: false; status: 400 | 404 | 409; errors: string[] }> {
    const index = this.questions.findIndex((q) => q.id === id);
    if (index < 0) return { ok: false, status: 404, errors: ['question not found'] };
    const parsed = toQuestion(raw);
    if (!parsed.ok) return { ok: false, status: 400, errors: parsed.errors };
    const newHash = questionHash(parsed.question.question);
    const clash = this.questions.find((q, i) => i !== index && questionHash(q.question) === newHash);
    if (clash) return { ok: false, status: 409, errors: ['another question already has this exact text'] };
    // The id stays stable so attempts and Leitner boxes keep pointing to this question.
    const updated: Question = { ...parsed.question, id };
    this.questions[index] = updated;
    await this.saveQuestions();
    return { ok: true, question: updated };
  }

  async deleteQuestion(id: string): Promise<boolean> {
    const before = this.questions.length;
    this.questions = this.questions.filter((q) => q.id !== id);
    if (this.questions.length === before) return false;
    await this.saveQuestions();
    if (this.progress.leitner[id]) {
      delete this.progress.leitner[id];
      await this.saveProgress();
    }
    return true;
  }
}

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { localDay } from '../shared/dates';
import { questionHash } from '../shared/hash';
import { reviewCard } from '../shared/leitner';
import { bankHashes, classifyBatch, extractQuestionArray, toQuestion } from '../shared/importer';
import {
  type Attempt,
  type Backup,
  type LeitnerCard,
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
export const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const SEED_DIR = path.join(APP_ROOT, 'seed');
/** Seed file that installs from before seed tracking loaded on their first run. */
const ORIGINAL_SEED = 'seed-questions.json';
const SEEDS_APPLIED_FILE = path.join(DATA_DIR, 'seeds-applied.json');

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
      await this.saveQuestions();
    } else {
      if (q.status === 'corrupt') await quarantine(FILES.questions);
      this.questions = q.status === 'ok' ? validItems(q.value, QuestionSchema, 'question') : [];
      if (q.status === 'corrupt') await this.saveQuestions();
    }
    await this.applySeeds(q.status === 'missing');

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

  /**
   * Adds each seed/*.json file to the bank once. Applied files are remembered in
   * seeds-applied.json, so questions the user deletes do not come back.
   */
  private async applySeeds(firstRun: boolean): Promise<void> {
    const marker = await readJson(SEEDS_APPLIED_FILE);
    const applied = new Set<string>(
      marker.status === 'ok' && Array.isArray(marker.value) ? marker.value.filter((v): v is string => typeof v === 'string') : [],
    );
    if (!firstRun && marker.status !== 'ok') applied.add(ORIGINAL_SEED);
    const before = applied.size;

    let files: string[] = [];
    try {
      files = (await fs.readdir(SEED_DIR)).filter((f) => f.endsWith('.json')).sort();
    } catch (err) {
      console.warn('[store] could not read the seed folder:', err);
    }
    let added = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      let raws: unknown[] | null = null;
      try {
        raws = extractQuestionArray(JSON.parse(await fs.readFile(path.join(SEED_DIR, file), 'utf8')));
      } catch (err) {
        console.warn(`[store] seed ${file} could not be read:`, err);
      }
      if (!raws) continue;
      const results = classifyBatch(raws, bankHashes(this.questions));
      let count = 0;
      for (const r of results) {
        if (r.status === 'valid') {
          this.questions.push(r.question);
          count++;
        }
      }
      added += count;
      applied.add(file);
      console.log(`[store] seed ${file}: added ${count} questions`);
    }
    if (added > 0) await this.saveQuestions();
    if (applied.size !== before || marker.status !== 'ok') await writeFileAtomic(SEEDS_APPLIED_FILE, JSON.stringify([...applied], null, 2));
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

  /** Stores answers and moves each question between Leitner boxes. */
  async addAttempts(attempts: Attempt[]): Promise<Record<string, LeitnerCard>> {
    const known = new Set(this.questions.map((q) => q.id));
    const today = localDay();
    const changed: Record<string, LeitnerCard> = {};
    for (const attempt of attempts) {
      this.progress.attempts.push(attempt);
      if (!known.has(attempt.questionId)) continue;
      const card = reviewCard(this.progress.leitner[attempt.questionId], attempt.correct, today);
      this.progress.leitner[attempt.questionId] = card;
      changed[attempt.questionId] = card;
    }
    await this.saveProgress();
    return changed;
  }

  async addSession(session: Session): Promise<void> {
    this.sessions = this.sessions.filter((s) => s.id !== session.id);
    this.sessions.push(session);
    await this.saveSessions();
  }

  toBackup(): Backup {
    return {
      app: 'netplus-trainer',
      version: 1,
      exportedAt: new Date().toISOString(),
      questions: this.questions,
      progress: this.progress,
      sessions: this.sessions,
    };
  }

  /** Replaces everything. The previous data is saved first in data/backups/ in case of a mistake. */
  async restore(backup: Backup): Promise<string> {
    await fs.mkdir(BACKUPS_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safetyCopy = path.join(BACKUPS_DIR, `before-restore-${stamp}.json`);
    await writeFileAtomic(safetyCopy, JSON.stringify(this.toBackup(), null, 2));
    this.questions = backup.questions;
    this.progress = backup.progress;
    this.sessions = backup.sessions;
    await Promise.all([this.saveQuestions(), this.saveProgress(), this.saveSessions()]);
    return safetyCopy;
  }
}

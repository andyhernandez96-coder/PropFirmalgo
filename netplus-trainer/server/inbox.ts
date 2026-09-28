import fs from 'node:fs/promises';
import path from 'node:path';
import { extractQuestionArray } from '../shared/importer';
import { FAILED_DIR, INBOX_DIR, PROCESSED_DIR, renameWithRetry, type Store } from './store';

export interface InboxLogEntry {
  file: string;
  at: string;
  status: 'imported' | 'failed';
  imported: number;
  duplicates: number;
  invalid: number;
  errors: string[];
  movedTo: string;
}

const log: InboxLogEntry[] = [];
const SCAN_EVERY_MS = 10_000;
/** Skip files modified in the last 2 s: they may still be copying. */
const SETTLE_MS = 2_000;

export function inboxLog(): InboxLogEntry[] {
  return [...log].reverse();
}

function record(entry: InboxLogEntry) {
  log.push(entry);
  if (log.length > 50) log.shift();
  const summary =
    entry.status === 'failed'
      ? `could not read (${entry.errors[0] ?? 'unknown error'})`
      : `${entry.imported} imported, ${entry.duplicates} duplicates, ${entry.invalid} invalid`;
  console.log(`[inbox] ${entry.file}: ${summary}`);
}

async function uniqueDestination(dir: string, name: string): Promise<string> {
  const target = path.join(dir, name);
  try {
    await fs.access(target);
  } catch {
    return target;
  }
  const ext = path.extname(name);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(dir, `${path.basename(name, ext)}-${stamp}${ext}`);
}

async function processFile(store: Store, name: string): Promise<void> {
  const full = path.join(INBOX_DIR, name);
  const at = new Date().toISOString();
  const fail = async (errors: string[]) => {
    const dest = await uniqueDestination(FAILED_DIR, name);
    await renameWithRetry(full, dest);
    await fs.writeFile(`${dest}.errors.txt`, errors.join('\n') + '\n', 'utf8');
    record({ file: name, at, status: 'failed', imported: 0, duplicates: 0, invalid: 0, errors, movedTo: dest });
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse((await fs.readFile(full, 'utf8')).replace(/^﻿/, ''));
  } catch (err) {
    await fail([`The file is not valid JSON: ${(err as Error).message}`]);
    return;
  }
  const items = extractQuestionArray(parsed);
  if (!items) {
    await fail(['The file must contain a list of questions: [ {...}, {...} ]']);
    return;
  }

  const result = await store.importQuestions(items, `inbox:${name}`);
  const dest = await uniqueDestination(PROCESSED_DIR, name);
  await renameWithRetry(full, dest);
  const errors = result.invalid.map((inv) => `Question #${inv.index + 1}: ${inv.errors.join('; ')}`);
  if (errors.length) await fs.writeFile(`${dest}.errors.txt`, errors.join('\n') + '\n', 'utf8');
  record({
    file: name,
    at,
    status: 'imported',
    imported: result.imported,
    duplicates: result.duplicates,
    invalid: result.invalid.length,
    errors,
    movedTo: dest,
  });
}

export async function scanInbox(store: Store): Promise<void> {
  const entries = await fs.readdir(INBOX_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.json')) continue;
    try {
      const stat = await fs.stat(path.join(INBOX_DIR, entry.name));
      if (Date.now() - stat.mtimeMs < SETTLE_MS) continue;
      await processFile(store, entry.name);
    } catch (err) {
      console.error(`[inbox] error with ${entry.name}:`, err);
    }
  }
}

export function startInboxWatcher(store: Store): void {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await scanInbox(store);
    } catch (err) {
      console.error('[inbox] scan failed:', err);
    } finally {
      running = false;
    }
  };
  void tick();
  setInterval(tick, SCAN_EVERY_MS);
}

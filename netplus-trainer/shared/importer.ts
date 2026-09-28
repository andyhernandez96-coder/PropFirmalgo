import { questionHash } from './hash';
import { formatIssues, type Question, QuestionInputSchema } from './schema';

export type DraftStatus =
  | { status: 'valid'; question: Question }
  | { status: 'duplicate'; question: Question }
  | { status: 'invalid'; errors: string[] };

/** Accepts either `[...]` or `{ "questions": [...] }`. */
export function extractQuestionArray(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { questions?: unknown }).questions)) {
    return (parsed as { questions: unknown[] }).questions;
  }
  return null;
}

function dropUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

export function toQuestion(raw: unknown): { ok: true; question: Question } | { ok: false; errors: string[] } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['item is not an object'] };
  }
  const parsed = QuestionInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: formatIssues(parsed.error) };
  const q = parsed.data;
  const question: Question = dropUndefined({
    id: questionHash(q.question),
    domain: q.domain,
    objective: q.objective,
    type: q.type,
    question: q.question,
    options: q.options,
    correct: q.correct,
    selectCount: q.selectCount,
    explanation: q.explanation,
    optionExplanations: q.optionExplanations,
    tags: q.tags,
    difficulty: q.difficulty,
    source: q.source,
  });
  return { ok: true, question };
}

/**
 * Validates every item independently: one bad question never blocks the rest.
 * `existingHashes` holds questionHash(text) of every question already in the bank.
 */
export function classifyBatch(raws: unknown[], existingHashes: ReadonlySet<string>): DraftStatus[] {
  const seen = new Set(existingHashes);
  return raws.map((raw) => {
    const result = toQuestion(raw);
    if (!result.ok) return { status: 'invalid', errors: result.errors };
    if (seen.has(result.question.id)) return { status: 'duplicate', question: result.question };
    seen.add(result.question.id);
    return { status: 'valid', question: result.question };
  });
}

export function bankHashes(questions: readonly Question[]): Set<string> {
  return new Set(questions.map((q) => questionHash(q.question)));
}

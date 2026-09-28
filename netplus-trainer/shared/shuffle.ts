import type { Question } from './schema';
import { type Rng, shuffled } from './random';

/**
 * Options that point at their position ("All of the above") or at other letters
 * ("Both A and C") stop making sense once the order changes, so those questions keep it.
 */
const KEEP_ORDER_PATTERNS = [
  /\b(?:all|none|both|neither)\s+of\s+(?:the\s+)?(?:above|following|these)\b/i,
  /\b(?:todas|ninguna|ambas)\s+(?:de\s+)?las\s+anteriores\b/i,
  /\b[A-H]\b\s*(?:,|and|&|or|y|o)\s*\b[A-H]\b/,
];

export function mustKeepOrder(question: Pick<Question, 'options'>): boolean {
  return question.options.some((opt) => KEEP_ORDER_PATTERNS.some((re) => re.test(opt)));
}

export interface PresentedQuestion {
  question: Question;
  /** order[presentedIndex] = original index */
  order: number[];
  options: string[];
  optionExplanations?: string[];
  /** Correct answers in PRESENTED positions. */
  correct: number[];
  shuffled: boolean;
}

export function presentQuestion(question: Question, rng: Rng = Math.random): PresentedQuestion {
  const identity = question.options.map((_, i) => i);
  const keep = mustKeepOrder(question);
  const order = keep ? identity : shuffled(identity, rng);
  return {
    question,
    order,
    options: order.map((i) => question.options[i]),
    optionExplanations: question.optionExplanations ? order.map((i) => question.optionExplanations![i] ?? '') : undefined,
    correct: question.correct.map((orig) => order.indexOf(orig)).sort((a, b) => a - b),
    shuffled: !keep,
  };
}

/** Converts presented positions back to the original option indexes (what gets stored). */
export function toOriginalIndexes(presented: PresentedQuestion, selected: readonly number[]): number[] {
  return selected.map((p) => presented.order[p]).sort((a, b) => a - b);
}

export function isAnswerCorrect(selected: readonly number[], correct: readonly number[]): boolean {
  if (selected.length !== correct.length) return false;
  const want = new Set(correct);
  return selected.every((i) => want.has(i));
}

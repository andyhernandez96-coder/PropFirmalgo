import { dueQuestionIds } from '../../shared/leitner';
import type { DomainId } from '../../shared/domains';
import type { LeitnerCard, Mode, Question, Session } from '../../shared/schema';
import type { PresentedQuestion } from '../../shared/shuffle';

export interface SessionConfig {
  mode: Mode;
  title: string;
  questions: Question[];
  /** Immediate feedback after every answer (every mode except the exam). */
  feedback: boolean;
  timeLimitSec?: number;
}

export interface SessionItemResult {
  presented: PresentedQuestion;
  /** Presented positions the user picked. */
  selected: number[];
  answered: boolean;
  correct: boolean;
  flagged: boolean;
}

export interface SessionResult {
  config: SessionConfig;
  session: Session;
  items: SessionItemResult[];
  /** Set when the timer ran out. */
  timedOut?: boolean;
  saveError?: string;
}

export function newSessionId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function domainOf(item: SessionItemResult): DomainId {
  return item.presented.question.domain;
}


/** Every question due for review today, lowest Leitner box first. */
export function buildSrsConfig(questions: Question[], leitner: Record<string, LeitnerCard>, today: string): SessionConfig {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const due = dueQuestionIds(leitner, today, new Set(byId.keys())).map((id) => byId.get(id)!);
  return { mode: 'srs', title: 'Spaced Repetition', feedback: true, questions: due };
}

export function countDue(questions: Question[], leitner: Record<string, LeitnerCard>, today: string): number {
  return dueQuestionIds(leitner, today, new Set(questions.map((q) => q.id))).length;
}

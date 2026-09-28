import type { DomainId } from '../../shared/domains';
import type { Mode, Question, Session } from '../../shared/schema';
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

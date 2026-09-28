import type { Attempt, Question } from './schema';

export interface QuestionStat {
  attempts: number;
  correct: number;
  lastAnsweredAt: string;
  lastWrongAt?: string;
}

export function questionStats(attempts: readonly Attempt[]): Map<string, QuestionStat> {
  const map = new Map<string, QuestionStat>();
  for (const a of attempts) {
    const s = map.get(a.questionId) ?? { attempts: 0, correct: 0, lastAnsweredAt: a.answeredAt };
    s.attempts++;
    if (a.correct) s.correct++;
    else if (!s.lastWrongAt || a.answeredAt > s.lastWrongAt) s.lastWrongAt = a.answeredAt;
    if (a.answeredAt > s.lastAnsweredAt) s.lastAnsweredAt = a.answeredAt;
    map.set(a.questionId, s);
  }
  return map;
}

/** Questions you have missed at least once, lowest accuracy first, most recent misses first on ties. */
export function selectWeakSpots(questions: readonly Question[], stats: ReadonlyMap<string, QuestionStat>, count: number): Question[] {
  return questions
    .filter((q) => {
      const s = stats.get(q.id);
      return s !== undefined && s.correct < s.attempts;
    })
    .sort((a, b) => {
      const sa = stats.get(a.id)!;
      const sb = stats.get(b.id)!;
      const diff = sa.correct / sa.attempts - sb.correct / sb.attempts;
      if (diff !== 0) return diff;
      return (sb.lastWrongAt ?? '').localeCompare(sa.lastWrongAt ?? '');
    })
    .slice(0, count);
}

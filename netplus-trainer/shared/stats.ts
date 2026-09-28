import { addDays, localDay } from './dates';
import { type DomainId, DOMAIN_IDS } from './domains';
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

export function overallAccuracy(attempts: readonly Attempt[]): { total: number; correct: number } {
  return { total: attempts.length, correct: attempts.filter((a) => a.correct).length };
}

export function accuracyByDomain(
  attempts: readonly Attempt[],
  questionsById: ReadonlyMap<string, Question>,
): Record<DomainId, { total: number; correct: number }> {
  const out = Object.fromEntries(DOMAIN_IDS.map((d) => [d, { total: 0, correct: 0 }])) as Record<
    DomainId,
    { total: number; correct: number }
  >;
  for (const a of attempts) {
    const q = questionsById.get(a.questionId);
    if (!q) continue;
    out[q.domain].total++;
    if (a.correct) out[q.domain].correct++;
  }
  return out;
}

export interface ObjectiveStat {
  objective: string;
  domain: DomainId;
  attempts: number;
  correct: number;
  accuracy: number;
}

/** Objectives with at least one miss, lowest accuracy first; more attempts first on ties. */
export function weakestObjectives(
  attempts: readonly Attempt[],
  questionsById: ReadonlyMap<string, Question>,
  limit = 5,
): ObjectiveStat[] {
  const map = new Map<string, ObjectiveStat>();
  for (const a of attempts) {
    const q = questionsById.get(a.questionId);
    if (!q?.objective) continue;
    const s = map.get(q.objective) ?? { objective: q.objective, domain: q.domain, attempts: 0, correct: 0, accuracy: 0 };
    s.attempts++;
    if (a.correct) s.correct++;
    map.set(q.objective, s);
  }
  return [...map.values()]
    .map((s) => ({ ...s, accuracy: s.correct / s.attempts }))
    .filter((s) => s.correct < s.attempts)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts || a.objective.localeCompare(b.objective))
    .slice(0, limit);
}

/**
 * Consecutive study days ending today. If you have not studied yet today but did
 * yesterday, the streak is still alive and counts up to yesterday.
 */
export function studyStreak(studyDays: ReadonlySet<string>, today: string): number {
  let day = studyDays.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (studyDays.has(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

export function studyDaysFrom(isoTimestamps: readonly string[]): Set<string> {
  return new Set(isoTimestamps.map((iso) => localDay(new Date(iso))));
}

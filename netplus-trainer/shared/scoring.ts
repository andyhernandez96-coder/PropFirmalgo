import { type DomainId, DOMAIN_IDS } from './domains';

export const PASSING_SCALED = 720;

/**
 * Linear estimate on CompTIA's 100–900 scale. CompTIA does not publish how raw
 * results convert to the scale, so this is only an approximation.
 */
export function estimateScaledScore(fractionCorrect: number): number {
  const f = Math.min(1, Math.max(0, fractionCorrect));
  return Math.round(100 + 800 * f);
}

export type DomainTally = Record<DomainId, { total: number; correct: number }>;

export function emptyTally(): DomainTally {
  return Object.fromEntries(DOMAIN_IDS.map((d) => [d, { total: 0, correct: 0 }])) as DomainTally;
}

export function tallyByDomain(items: readonly { domain: DomainId; correct: boolean }[]): DomainTally {
  const tally = emptyTally();
  for (const item of items) {
    tally[item.domain].total++;
    if (item.correct) tally[item.domain].correct++;
  }
  return tally;
}

export function pct(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 1000) / 10;
}

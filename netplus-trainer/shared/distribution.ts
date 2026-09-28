import { type DomainId, DOMAINS, DOMAIN_IDS, domainName } from './domains';
import type { Question } from './schema';
import { type Rng, sample, shuffled } from './random';

export interface Allocation {
  perDomain: Record<DomainId, number>;
  total: number;
  warnings: string[];
}

/**
 * Splits `requested` questions across the 5 domains by exam weight (largest-remainder
 * method). When a domain does not have enough questions, the missing ones go to the
 * domains that do, and a warning explains it.
 */
export function allocateByWeight(requested: number, available: Record<DomainId, number>): Allocation {
  const warnings: string[] = [];
  const bankSize = DOMAIN_IDS.reduce((n, d) => n + (available[d] ?? 0), 0);
  let total = Math.max(0, Math.floor(requested));
  if (total > bankSize) {
    warnings.push(`You asked for ${total} questions but your bank only has ${bankSize}. The exam will use all ${bankSize}.`);
    total = bankSize;
  }

  // Integer math (weights as whole percents) so float noise such as 0.14 * 90 = 12.600000000000001 cannot break ties.
  const percent = Object.fromEntries(DOMAINS.map((d) => [d.id, Math.round(d.weight * 100)])) as Record<DomainId, number>;
  const share = (d: DomainId) => percent[d] * total; // = ideal share x 100
  const perDomain = Object.fromEntries(DOMAIN_IDS.map((d) => [d, Math.floor(share(d) / 100)])) as Record<DomainId, number>;
  let left = total - DOMAIN_IDS.reduce((n, d) => n + perDomain[d], 0);
  const byRemainder = [...DOMAINS].sort((a, b) => (share(b.id) % 100) - (share(a.id) % 100) || b.weight - a.weight);
  for (let i = 0; left > 0; i = (i + 1) % byRemainder.length, left--) perDomain[byRemainder[i].id]++;

  let deficit = 0;
  for (const d of DOMAIN_IDS) {
    const have = available[d] ?? 0;
    if (perDomain[d] > have) {
      warnings.push(`Domain ${d} ${domainName(d)} should get ${perDomain[d]} questions but your bank only has ${have}.`);
      deficit += perDomain[d] - have;
      perDomain[d] = have;
    }
  }
  while (deficit > 0) {
    // Give the next question to the domain furthest below its weighted share that still has spare questions.
    const candidates = DOMAINS.filter((d) => perDomain[d.id] < (available[d.id] ?? 0));
    if (candidates.length === 0) break;
    const gap = (d: DomainId) => share(d) - 100 * perDomain[d];
    candidates.sort((a, b) => gap(b.id) - gap(a.id) || b.weight - a.weight);
    perDomain[candidates[0].id]++;
    deficit--;
  }
  if (warnings.length > 0 && total > 0) {
    warnings.push('The domain mix will not match the real exam weights exactly until you import more questions.');
  }
  return { perDomain, total, warnings };
}

export function pickExamQuestions(questions: readonly Question[], requested: number, rng: Rng = Math.random) {
  const byDomain = Object.fromEntries(DOMAIN_IDS.map((d) => [d, questions.filter((q) => q.domain === d)])) as Record<
    DomainId,
    Question[]
  >;
  const available = Object.fromEntries(DOMAIN_IDS.map((d) => [d, byDomain[d].length])) as Record<DomainId, number>;
  const allocation = allocateByWeight(requested, available);
  const picked = DOMAIN_IDS.flatMap((d) => sample(byDomain[d], allocation.perDomain[d], rng));
  return { questions: shuffled(picked, rng), allocation };
}

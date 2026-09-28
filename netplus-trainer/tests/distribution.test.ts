import { describe, expect, it } from 'vitest';
import { allocateByWeight, pickExamQuestions } from '../shared/distribution';
import type { DomainId } from '../shared/domains';
import type { Question } from '../shared/schema';
import { seededRng } from '../shared/random';

const plenty = { '1.0': 500, '2.0': 500, '3.0': 500, '4.0': 500, '5.0': 500 };
const values = (r: Record<DomainId, number>) => ['1.0', '2.0', '3.0', '4.0', '5.0'].map((d) => r[d as DomainId]);
const sum = (r: Record<DomainId, number>) => values(r).reduce((a, b) => a + b, 0);

describe('allocateByWeight', () => {
  it('splits 90 questions by the N10-009 weights', () => {
    // 23% 20% 19% 14% 24% of 90 = 20.7 18 17.1 12.6 21.6
    const a = allocateByWeight(90, plenty);
    expect(values(a.perDomain)).toEqual([21, 18, 17, 12, 22]);
    expect(a.total).toBe(90);
    expect(a.warnings).toEqual([]);
  });

  it('matches the weights exactly for 100 questions', () => {
    expect(values(allocateByWeight(100, plenty).perDomain)).toEqual([23, 20, 19, 14, 24]);
  });

  it('always adds up to the requested total', () => {
    for (let n = 0; n <= 150; n++) expect(sum(allocateByWeight(n, plenty).perDomain)).toBe(n);
  });

  it('breaks remainder ties in favor of the heavier domain', () => {
    // 10 questions: 2.3 2 1.9 1.4 2.4 -> the last .4 tie goes to 5.0 (24%) over 4.0 (14%)
    expect(values(allocateByWeight(10, plenty).perDomain)).toEqual([2, 2, 2, 1, 3]);
  });

  it('moves questions to other domains when one is short, with a warning', () => {
    const a = allocateByWeight(90, { ...plenty, '4.0': 3 });
    expect(a.perDomain['4.0']).toBe(3);
    expect(sum(a.perDomain)).toBe(90);
    expect(a.warnings.some((w) => w.includes('4.0'))).toBe(true);
  });

  it('uses the whole bank when it is smaller than requested', () => {
    const small = { '1.0': 3, '2.0': 3, '3.0': 3, '4.0': 3, '5.0': 3 };
    const a = allocateByWeight(90, small);
    expect(a.total).toBe(15);
    expect(values(a.perDomain)).toEqual([3, 3, 3, 3, 3]);
    expect(a.warnings[0]).toContain('only has 15');
  });
});

describe('pickExamQuestions', () => {
  it('returns distinct questions following the allocation', () => {
    const questions: Question[] = [];
    (['1.0', '2.0', '3.0', '4.0', '5.0'] as DomainId[]).forEach((domain) => {
      for (let i = 0; i < 40; i++) {
        questions.push({
          id: `${domain}-${i}`,
          domain,
          type: 'single',
          question: `${domain} q${i}`,
          options: ['a', 'b'],
          correct: [0],
          selectCount: 1,
          explanation: '',
        });
      }
    });
    const { questions: picked, allocation } = pickExamQuestions(questions, 90, seededRng(7));
    expect(picked).toHaveLength(90);
    expect(new Set(picked.map((q) => q.id)).size).toBe(90);
    for (const d of ['1.0', '2.0', '3.0', '4.0', '5.0'] as DomainId[]) {
      expect(picked.filter((q) => q.domain === d)).toHaveLength(allocation.perDomain[d]);
    }
  });
});

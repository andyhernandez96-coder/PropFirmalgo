import { describe, expect, it } from 'vitest';
import { BOX_INTERVAL_DAYS, dueQuestionIds, isDue, reviewCard } from '../shared/leitner';

const today = '2026-09-28';

describe('reviewCard (Leitner, 5 boxes)', () => {
  it('first answer: correct goes to box 2, wrong to box 1', () => {
    expect(reviewCard(undefined, true, today)).toEqual({ box: 2, lastReviewed: today, due: '2026-09-30' });
    expect(reviewCard(undefined, false, today)).toEqual({ box: 1, lastReviewed: today, due: '2026-09-29' });
  });

  it('a correct answer on a due card moves it up one box with the matching interval', () => {
    let card = { box: 1, lastReviewed: '2026-09-27', due: today };
    const expectedBoxes = [2, 3, 4, 5, 5];
    let day = today;
    for (const box of expectedBoxes) {
      card = reviewCard(card, true, day);
      expect(card.box).toBe(box);
      expect(card.due > day).toBe(true);
      day = card.due;
    }
    expect(BOX_INTERVAL_DAYS[4]).toBe(16);
  });

  it('a wrong answer sends any box back to 1', () => {
    const card = { box: 4, lastReviewed: '2026-09-20', due: '2026-10-05' };
    expect(reviewCard(card, false, today)).toEqual({ box: 1, lastReviewed: today, due: '2026-09-29' });
  });

  it('answering correctly before the due date does not promote', () => {
    const card = { box: 3, lastReviewed: '2026-09-27', due: '2026-10-01' };
    expect(reviewCard(card, true, today)).toBe(card);
  });

  it('box 5 stays at 5', () => {
    const card = { box: 5, lastReviewed: '2026-09-12', due: today };
    expect(reviewCard(card, true, today)).toEqual({ box: 5, lastReviewed: today, due: '2026-10-14' });
  });

  it('lists due cards, lowest box first, ignoring deleted questions', () => {
    const leitner = {
      a: { box: 3, lastReviewed: '2026-09-20', due: '2026-09-24' },
      b: { box: 1, lastReviewed: '2026-09-27', due: today },
      c: { box: 2, lastReviewed: today, due: '2026-09-30' },
      gone: { box: 1, lastReviewed: '2026-09-01', due: '2026-09-02' },
    };
    expect(isDue(leitner.c, today)).toBe(false);
    expect(dueQuestionIds(leitner, today, new Set(['a', 'b', 'c']))).toEqual(['b', 'a']);
  });
});

import { describe, expect, it } from 'vitest';
import type { Question } from '../shared/schema';
import { seededRng } from '../shared/random';
import { isAnswerCorrect, mustKeepOrder, presentQuestion, toOriginalIndexes } from '../shared/shuffle';

const q = (options: string[], correct: number[], optionExplanations?: string[]): Question => ({
  id: 'q_test',
  domain: '1.0',
  type: correct.length > 1 ? 'multiple' : 'single',
  question: 'Test?',
  options,
  correct,
  selectCount: correct.length,
  explanation: '',
  optionExplanations,
});

describe('presentQuestion', () => {
  it('keeps the correct answer pointing at the same option text after shuffling', () => {
    const question = q(['SSH', 'RDP', 'Telnet', 'SMB', 'FTP'], [1, 4], ['e0', 'e1', 'e2', 'e3', 'e4']);
    for (let seed = 1; seed <= 200; seed++) {
      const p = presentQuestion(question, seededRng(seed));
      expect(p.correct.map((i) => p.options[i]).sort()).toEqual(['FTP', 'RDP']);
      p.options.forEach((text, i) => {
        expect(p.optionExplanations![i]).toBe(`e${question.options.indexOf(text)}`);
      });
      expect(toOriginalIndexes(p, p.correct)).toEqual([1, 4]);
      expect(isAnswerCorrect(toOriginalIndexes(p, p.correct), question.correct)).toBe(true);
    }
  });

  it('actually changes the order across seeds', () => {
    const question = q(['a', 'b', 'c', 'd'], [0]);
    const orders = new Set(Array.from({ length: 50 }, (_, s) => presentQuestion(question, seededRng(s + 1)).order.join('')));
    expect(orders.size).toBeGreaterThan(5);
  });

  it('never shuffles "All of the above", "None of the above" or letter references', () => {
    const cases = [
      ['WPA2', 'WPA3', 'AES', 'All of the above'],
      ['x', 'y', 'z', 'None of the above'],
      ['Layer 2', 'Layer 3', 'Both A and B', 'Neither'],
      ['uno', 'dos', 'tres', 'Todas las anteriores'],
    ];
    for (const options of cases) {
      const question = q(options, [3]);
      expect(mustKeepOrder(question)).toBe(true);
      for (let seed = 1; seed <= 20; seed++) {
        const p = presentQuestion(question, seededRng(seed));
        expect(p.options).toEqual(options);
        expect(p.correct).toEqual([3]);
        expect(p.shuffled).toBe(false);
      }
    }
  });

  it('does not freeze normal options that merely contain capital words', () => {
    expect(mustKeepOrder(q(['HTTP and FTP', 'PCI DSS and GDPR', 'Class C', 'IPv6'], [0]))).toBe(false);
  });
});

describe('isAnswerCorrect', () => {
  it('needs exactly the same set, in any order', () => {
    expect(isAnswerCorrect([3, 1], [1, 3])).toBe(true);
    expect(isAnswerCorrect([1], [1, 3])).toBe(false);
    expect(isAnswerCorrect([1, 2], [1, 3])).toBe(false);
    expect(isAnswerCorrect([1, 3, 2], [1, 3])).toBe(false);
  });
});

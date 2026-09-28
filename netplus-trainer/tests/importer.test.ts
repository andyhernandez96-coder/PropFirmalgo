import { describe, expect, it } from 'vitest';
import { questionHash } from '../shared/hash';
import { classifyBatch, extractQuestionArray } from '../shared/importer';

const base = {
  domain: '1.0',
  question: 'Which protocol uses port 3389?',
  options: ['SSH', 'RDP', 'Telnet', 'SMB'],
  correct: [1],
  explanation: 'RDP = 3389',
};

describe('classifyBatch', () => {
  it('marks valid, duplicate and invalid items independently', () => {
    const result = classifyBatch(
      [
        base,
        { ...base, question: '  which PROTOCOL uses port 3389 ' },
        { ...base, question: 'Other?', correct: [9] },
      ],
      new Set(),
    );
    expect(result.map((r) => r.status)).toEqual(['valid', 'duplicate', 'invalid']);
    if (result[2].status === 'invalid') expect(result[2].errors[0]).toContain('out of range');
  });

  it('derives type and selectCount and detects questions already in the bank', () => {
    const multi = { ...base, question: 'Pick two', correct: [3, 1] };
    const [r] = classifyBatch([multi], new Set());
    expect(r.status).toBe('valid');
    if (r.status === 'valid') {
      expect(r.question.type).toBe('multiple');
      expect(r.question.selectCount).toBe(2);
      expect(r.question.correct).toEqual([1, 3]);
    }
    const [dup] = classifyBatch([base], new Set([questionHash(base.question)]));
    expect(dup.status).toBe('duplicate');
  });

  it('rejects an objective that belongs to another domain', () => {
    const [r] = classifyBatch([{ ...base, objective: '3.2' }], new Set());
    expect(r.status).toBe('invalid');
  });
});

describe('extractQuestionArray', () => {
  it('accepts an array or an object with a questions array', () => {
    expect(extractQuestionArray([1])).toEqual([1]);
    expect(extractQuestionArray({ questions: [2] })).toEqual([2]);
    expect(extractQuestionArray({ nope: true })).toBeNull();
  });
});

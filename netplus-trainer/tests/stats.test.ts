import { describe, expect, it } from 'vitest';
import { askClaudePrompt, generatorPrompt } from '../shared/prompts';
import type { Attempt, Question } from '../shared/schema';
import { selectWeakSpots, questionStats, studyStreak, weakestObjectives } from '../shared/stats';

const q = (id: string, objective?: string): Question => ({
  id,
  domain: '1.0',
  objective,
  type: 'single',
  question: id,
  options: ['a', 'b'],
  correct: [0],
  selectCount: 1,
  explanation: '',
});
const at = (questionId: string, correct: boolean, answeredAt = '2026-09-28T10:00:00.000Z'): Attempt => ({
  questionId,
  correct,
  selected: [correct ? 0 : 1],
  mode: 'practice',
  sessionId: 's',
  answeredAt,
});

describe('studyStreak', () => {
  it('counts consecutive days ending today, or yesterday if today has no study yet', () => {
    const days = new Set(['2026-09-26', '2026-09-27', '2026-09-28']);
    expect(studyStreak(days, '2026-09-28')).toBe(3);
    expect(studyStreak(days, '2026-09-29')).toBe(3);
    expect(studyStreak(days, '2026-09-30')).toBe(0);
    expect(studyStreak(new Set(['2026-09-28', '2026-09-26']), '2026-09-28')).toBe(1);
  });
});

describe('weak spots and objectives', () => {
  const questions = [q('q1', '1.1'), q('q2', '1.4'), q('q3', '1.4'), q('q4')];
  const byId = new Map(questions.map((x) => [x.id, x]));
  const attempts = [
    at('q1', true),
    at('q2', false, '2026-09-27T10:00:00.000Z'),
    at('q2', true),
    at('q3', false, '2026-09-28T11:00:00.000Z'),
    at('q4', false),
  ];

  it('orders missed questions by accuracy, then most recent miss', () => {
    const weak = selectWeakSpots(questions, questionStats(attempts), 10).map((x) => x.id);
    expect(weak).toEqual(['q3', 'q4', 'q2']);
  });

  it('lists only objectives with misses, weakest first', () => {
    const w = weakestObjectives(attempts, byId);
    expect(w.map((o) => [o.objective, o.correct, o.attempts])).toEqual([['1.4', 1, 3]]);
  });
});

describe('prompts', () => {
  it('ask-Claude prompt lists options with letters and both answers', () => {
    const text = askClaudePrompt({ question: 'Port?', options: ['22', '3389'], correct: [1], selected: [0], answered: true });
    expect(text).toContain('A) 22');
    expect(text).toContain('My answer: A) 22');
    expect(text).toContain('Correct answer: B) 3389');
    expect(text).toContain('Explain why my answer is wrong and why the correct one is right');
  });

  it('generator prompt carries the schema fields and the scope', () => {
    const text = generatorPrompt({ count: 12, domain: '4.0', today: '2026-09-28' });
    for (const field of ['"domain"', '"correct"', '"selectCount"', '"optionExplanations"', 'claude-chat-2026-09-28']) {
      expect(text).toContain(field);
    }
    expect(text).toContain('domain 4.0 Network Security');
  });
});

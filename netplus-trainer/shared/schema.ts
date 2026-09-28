import { z } from 'zod';
import { DOMAIN_IDS, domainFromObjective } from './domains';

export const DomainSchema = z.enum(DOMAIN_IDS);
export const DifficultySchema = z.enum(['easy', 'medium', 'hard']);
export const QuestionTypeSchema = z.enum(['single', 'multiple']);

const QuestionBase = z.object({
  id: z.string().optional(),
  domain: DomainSchema,
  objective: z
    .string()
    .trim()
    .regex(/^[1-5]\.\d{1,2}$/, 'objective must look like "1.4"')
    .optional(),
  type: QuestionTypeSchema.optional(),
  question: z.string().trim().min(1, 'question text is empty'),
  options: z.array(z.string().trim().min(1, 'an option is empty')).min(2, 'needs at least 2 options').max(8, 'max 8 options'),
  correct: z.array(z.number().int().nonnegative()).min(1, 'needs at least 1 correct answer'),
  selectCount: z.number().int().positive().optional(),
  explanation: z.string().default(''),
  optionExplanations: z.array(z.string()).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  difficulty: DifficultySchema.optional(),
  source: z.string().optional(),
});

/**
 * Accepts a question as pasted/imported. `type` and `selectCount` are derived
 * from `correct` when missing, and checked for consistency when present.
 * The id is always recomputed from the question text.
 */
export const QuestionInputSchema = QuestionBase.superRefine((q, ctx) => {
  const unique = new Set(q.correct);
  if (unique.size !== q.correct.length) {
    ctx.addIssue({ code: 'custom', path: ['correct'], message: 'correct has repeated indexes' });
  }
  for (const idx of q.correct) {
    if (idx >= q.options.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['correct'],
        message: `correct index ${idx} is out of range (only ${q.options.length} options, indexes start at 0)`,
      });
    }
  }
  if (q.type === 'single' && q.correct.length !== 1) {
    ctx.addIssue({ code: 'custom', path: ['type'], message: 'type "single" must have exactly 1 correct answer' });
  }
  if (q.type === 'multiple' && q.correct.length < 2) {
    ctx.addIssue({ code: 'custom', path: ['type'], message: 'type "multiple" needs 2 or more correct answers' });
  }
  if (q.selectCount !== undefined && q.selectCount !== q.correct.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['selectCount'],
      message: `selectCount is ${q.selectCount} but there are ${q.correct.length} correct answers`,
    });
  }
  if (q.optionExplanations && q.optionExplanations.length !== q.options.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['optionExplanations'],
      message: `optionExplanations has ${q.optionExplanations.length} items but there are ${q.options.length} options`,
    });
  }
  if (q.objective) {
    const fromObjective = domainFromObjective(q.objective);
    if (fromObjective && fromObjective !== q.domain) {
      ctx.addIssue({
        code: 'custom',
        path: ['objective'],
        message: `objective ${q.objective} belongs to domain ${fromObjective}, not ${q.domain}`,
      });
    }
  }
}).transform((q) => ({
  ...q,
  type: q.type ?? (q.correct.length > 1 ? ('multiple' as const) : ('single' as const)),
  selectCount: q.selectCount ?? q.correct.length,
  correct: [...q.correct].sort((a, b) => a - b),
}));

export type QuestionInput = z.input<typeof QuestionInputSchema>;

export const QuestionSchema = z.object({
  id: z.string(),
  domain: DomainSchema,
  objective: z.string().optional(),
  type: QuestionTypeSchema,
  question: z.string(),
  options: z.array(z.string()),
  correct: z.array(z.number().int().nonnegative()),
  selectCount: z.number().int().positive(),
  explanation: z.string(),
  optionExplanations: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  difficulty: DifficultySchema.optional(),
  source: z.string().optional(),
});
export type Question = z.infer<typeof QuestionSchema>;

export const ModeSchema = z.enum(['practice', 'weak', 'srs', 'drill', 'exam']);
export type Mode = z.infer<typeof ModeSchema>;

export const MODE_LABELS: Record<Mode, string> = {
  practice: 'Practice',
  weak: 'Weak Spots',
  srs: 'Spaced Repetition',
  drill: 'Domain Drill',
  exam: 'Exam Simulation',
};

/** `selected` always uses the ORIGINAL option indexes (before shuffling). */
export const AttemptSchema = z.object({
  questionId: z.string(),
  selected: z.array(z.number().int().nonnegative()),
  correct: z.boolean(),
  mode: ModeSchema,
  sessionId: z.string(),
  answeredAt: z.string(),
});
export type Attempt = z.infer<typeof AttemptSchema>;

export const LeitnerCardSchema = z.object({
  box: z.number().int().min(1).max(5),
  lastReviewed: z.string(),
  due: z.string(),
});
export type LeitnerCard = z.infer<typeof LeitnerCardSchema>;

export const ProgressSchema = z.object({
  attempts: z.array(AttemptSchema),
  leitner: z.record(z.string(), LeitnerCardSchema),
});
export type Progress = z.infer<typeof ProgressSchema>;

export const DomainTallySchema = z.object({ total: z.number().int(), correct: z.number().int() });

export const SessionSchema = z.object({
  id: z.string(),
  mode: ModeSchema,
  startedAt: z.string(),
  endedAt: z.string(),
  durationSec: z.number().nonnegative(),
  total: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  scorePct: z.number().min(0).max(100),
  byDomain: z.record(z.string(), DomainTallySchema),
  estimatedScaled: z.number().optional(),
});
export type Session = z.infer<typeof SessionSchema>;

export const BackupSchema = z.object({
  app: z.literal('netplus-trainer'),
  version: z.literal(1),
  exportedAt: z.string(),
  questions: z.array(QuestionSchema),
  progress: ProgressSchema,
  sessions: z.array(SessionSchema),
});
export type Backup = z.infer<typeof BackupSchema>;

/** Human-readable list of zod issues, e.g. "correct: index 5 is out of range". */
export function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const where = issue.path.length ? `${issue.path.join('.')}: ` : '';
    return `${where}${issue.message}`;
  });
}

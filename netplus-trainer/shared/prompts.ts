import { type DomainId, domainName } from './domains';

const LETTERS = 'ABCDEFGH';

export interface AskClaudeInput {
  question: string;
  /** Options in the order the user saw them. */
  options: string[];
  /** Presented indexes. */
  correct: number[];
  selected: number[];
  answered: boolean;
}

const line = (options: string[], i: number) => `${LETTERS[i]}) ${options[i]}`;

/** Text for the "Ask Claude" button: question, options, both answers and what to explain. */
export function askClaudePrompt(input: AskClaudeInput): string {
  const { question, options, correct, selected, answered } = input;
  const isRight = answered && selected.length === correct.length && selected.every((i) => correct.includes(i));
  const mine = answered && selected.length > 0 ? selected.map((i) => line(options, i)).join('; ') : '(no answer)';
  const right = correct.map((i) => line(options, i)).join('; ');
  const ask = !answered
    ? 'I left this one blank. Explain which answer is right and why the others are wrong, in simple terms, with a real-world example.'
    : isRight
      ? 'I got this one right, but I want to be sure I understand it. Explain why the correct answer is right and why each other option is wrong, in simple terms, with a real-world example.'
      : 'Explain why my answer is wrong and why the correct one is right, in simple terms, with a real-world example.';
  return [
    "I'm studying for the CompTIA Network+ (N10-009) exam. Here is a practice question:",
    '',
    question,
    '',
    ...options.map((_, i) => line(options, i)),
    '',
    `My answer: ${mine}`,
    `Correct answer: ${right}`,
    '',
    ask,
    'Answer in Spanish, and spell out every acronym the first time you use it.',
  ].join('\n');
}

export interface GeneratorInput {
  count: number;
  domain?: DomainId;
  objective?: string;
  today: string;
}

/** Prompt that asks Claude for new questions in this app's exact JSON schema. */
export function generatorPrompt({ count, domain, objective, today }: GeneratorInput): string {
  const scope = objective
    ? `All ${count} questions must be about N10-009 objective ${objective}${domain ? ` (domain ${domain} ${domainName(domain)})` : ''}.`
    : domain
      ? `All ${count} questions must belong to domain ${domain} ${domainName(domain)}, spread across its objectives.`
      : `Spread the ${count} questions across the five domains by their exam weight: 1.0 Networking Concepts 23%, 2.0 Network Implementation 20%, 3.0 Network Operations 19%, 4.0 Network Security 14%, 5.0 Network Troubleshooting 24%.`;
  return `Write ${count} ORIGINAL practice questions for the CompTIA Network+ N10-009 exam (not N10-008). Do not copy real exam questions or brain-dump material.

${scope}

Return ONLY a JSON array inside one \`\`\`json code block, with no text before or after it and no comments inside the JSON. Every item must have exactly these fields:

{
  "domain": "1.0",
  "objective": "1.4",
  "type": "single",
  "question": "A technician needs to ... Which protocol ...?",
  "options": ["...", "...", "...", "..."],
  "correct": [1],
  "selectCount": 1,
  "explanation": "...",
  "optionExplanations": ["...", "...", "...", "..."],
  "tags": ["ports"],
  "difficulty": "medium",
  "source": "claude-chat-${today}"
}

Field rules:
- "domain": one of "1.0", "2.0", "3.0", "4.0", "5.0".
- "objective": the N10-009 objective number like "2.3". Its first digit must match the domain. If you are not sure of the exact number, leave the field out instead of guessing.
- "type": "single" (one correct answer) or "multiple" (two or more).
- "options": 4 options for single questions, 4 to 6 for multiple.
- "correct": 0-based indexes into "options" (the first option is 0).
- "selectCount": must equal the number of items in "correct".
- "optionExplanations": same length and order as "options"; for each option, one sentence saying why it is right or wrong.
- "difficulty": "easy", "medium" or "hard" (about 30% easy, 50% medium, 20% hard).

Content rules:
- "question" and "options" in ENGLISH, worded like the real exam.
- "explanation" and "optionExplanations" in SPANISH, in simple words, for a beginner. Spell out every acronym the first time, e.g. "UDP (User Datagram Protocol)".
- Mix scenario questions ("A technician notices...", "Users report...") with direct ones.
- About 1 in 5 questions should be "multiple", ending the question text with "(Choose TWO)".
- Single questions must have exactly one clearly correct answer. Wrong options must be plausible, not silly.
- Do not use "All of the above", "None of the above", or options that refer to other letters.
- Vary the position of the correct answer.`;
}

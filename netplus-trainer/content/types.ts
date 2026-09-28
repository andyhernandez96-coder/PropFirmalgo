/**
 * Compact authoring format for the question bank:
 * [objective, difficulty, tags, question, right, wrong, explanation, whyWrong]
 * - right: the correct option, or an array of them for "(Choose TWO)" questions
 * - wrong: the incorrect options
 * - whyWrong: one short reason per wrong option, same order as `wrong`
 * Options are shuffled when the bank is built, so authoring order does not matter.
 */
export type Raw = [
  objective: string,
  difficulty: 'e' | 'm' | 'h',
  tags: string,
  question: string,
  right: string | string[],
  wrong: string[],
  explanation: string,
  whyWrong: string[],
];

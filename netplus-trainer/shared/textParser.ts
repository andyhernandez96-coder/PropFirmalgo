import { type DomainId, domainFromObjective } from './domains';

/**
 * Tolerant parser for questions copied from a chat. Handles, among others:
 *
 *   1. Which protocol uses port 3389?
 *   A) SSH  B) RDP  C) Telnet  D) SMB
 *   Answer: B
 *   Explanation: ...
 *
 * Option markers "A)", "A.", "(A)", "a)"; answer labels "Answer:", "Correct answer:",
 * "Answer: B, D", "Respuesta correcta: b)"; "Choose TWO"; explanations on several lines;
 * and a separate "Answer Key" section after all the questions (the tutor format).
 */

export interface ParsedDraft {
  number: number;
  question: string;
  options: string[];
  correct: number[];
  /** Only set when the text says "Choose TWO" or similar. */
  selectCount?: number;
  explanation: string;
  domain?: DomainId;
  objective?: string;
  /** Problems the parser found (the schema validation adds its own later). */
  errors: string[];
}

const LETTERS = 'ABCDEFGH';

const Q_START = /^\s*(?:(?:question|pregunta|q)\s*#?\s*)?(\d{1,3})\s*[.):\-](?:\s+(.*))?$/i;
const KEY_ENTRY = /^\s*(?:(?:question|pregunta|q)\s*#?\s*)?(\d{1,3})\s*[.):\-]\s*(.*)$/i;
const OPT_START = /^\s*(?:[-*]\s+)?\(?([A-Ha-h])\s*[).:]\s+(.*)$/;
const ANSWER =
  /^\s*(?:[-*]\s+)?(?:the\s+)?(?:correct\s+answers?|answers?|correct|respuestas?\s+correctas?|respuestas?|correctas?|soluci[oó]n|solution)(?:\s+(?:is|are|es|son)\s+|\s*[:\-–=]\s*)(.*)$/i;
const EXPLANATION = /^\s*(?:[-*]\s+)?(?:explanation|explicaci[oó]n|rationale|reason)\s*[:\-–]\s*(.*)$/i;
const META_LINE = /^\s*(?:domain|dominio|objective|objetivo)\b/i;
const DOMAIN_IN_LINE = /(?:domain|dominio)\s*[:\-–]?\s*([1-5])(?:\.0)?\b/i;
const OBJECTIVE_IN_LINE = /(?:objective|objetivo)\s*[:\-–]?\s*([1-5]\.\d{1,2})\b/i;
const CHOOSE =
  /\b(?:choose|select|pick|elige|elegir|selecciona|seleccione|escoge)\s+(two|three|four|2|3|4|dos|tres|cuatro)\b/i;
const HEADER = /^\s*#{1,6}\s/;
const KEY_HEADER_HASH = /^\s*#{1,6}\s*(?:answer\s*key|answers|respuestas|soluciones|solutions|clave\s+de\s+respuestas)\b/i;
const KEY_HEADER_PLAIN = /^\s*(?:answer\s*key|answers|respuestas|soluciones|solutions|clave\s+de\s+respuestas)\s*:?\s*$/i;

const COUNT_WORDS: Record<string, number> = {
  two: 2, three: 3, four: 4, dos: 2, tres: 3, cuatro: 4, '2': 2, '3': 3, '4': 4,
};

function cleanLine(line: string): string {
  return line.replace(/\*\*|__/g, '').replace(/\t/g, '    ').replace(/\s+$/, '');
}

function isKeyHeader(line: string): boolean {
  return KEY_HEADER_HASH.test(line) || KEY_HEADER_PLAIN.test(line);
}

/** Splits "SSH  B) RDP  C) Telnet" into ["SSH", "RDP", "Telnet"], starting after letter `firstIndex`. */
function splitInlineOptions(text: string, firstIndex: number, upper: boolean): string[] {
  const out: string[] = [];
  let rest = text;
  let index = firstIndex;
  for (;;) {
    const next = LETTERS[index + 1];
    if (!next) break;
    const letter = upper ? next : next.toLowerCase();
    const re = new RegExp(`\\s\\(?${letter}\\s*[).:]\\s+`);
    const m = re.exec(rest);
    if (!m) break;
    out.push(rest.slice(0, m.index).trim());
    rest = rest.slice(m.index + m[0].length);
    index++;
  }
  out.push(rest.trim());
  return out;
}

/** Finds options written on the same line as the question: "Which...? A) SSH B) RDP". */
function splitQuestionLineOptions(text: string): { question: string; options: string[] } | null {
  const m = /\s\(?([Aa])\s*[).]\s+/.exec(text);
  if (!m) return null;
  const upper = m[1] === 'A';
  const after = text.slice(m.index + m[0].length);
  const b = upper ? 'B' : 'b';
  if (!new RegExp(`\\s\\(?${b}\\s*[).]\\s+`).test(after)) return null;
  return { question: text.slice(0, m.index).trim(), options: splitInlineOptions(after, 0, upper) };
}

/**
 * Reads the leading answer letters of "B, D because..." -> { letters: [1, 3], remainder: "because..." }.
 * Stops at the first word that is not a single option letter.
 */
export function extractAnswerLetters(text: string): { letters: number[]; remainder: string } {
  const TOKEN = /^\(?([A-Ha-h])\)?(?![A-Za-z0-9])[.:)]?\s*/;
  const SEP = /^(?:,|;|&|\/|\+|\band\b|\by\b)\s*/i;
  let s = text.trim();
  const letters: number[] = [];
  for (;;) {
    const m = TOKEN.exec(s);
    if (!m) break;
    letters.push(LETTERS.indexOf(m[1].toUpperCase()));
    s = s.slice(m[0].length);
    const sep = SEP.exec(s);
    if (!sep) break;
    const afterSep = s.slice(sep[0].length);
    if (!TOKEN.test(afterSep)) break;
    s = afterSep;
  }
  return { letters, remainder: s.replace(/^[\s,;:.\-–]+/, '').trim() };
}

function answerFromText(text: string, options: string[]): { letters: number[]; remainder: string } {
  const byLetter = extractAnswerLetters(text);
  if (byLetter.letters.length > 0) return byLetter;
  const wanted = text.trim().replace(/[.\s]+$/, '').toLowerCase();
  const idx = options.findIndex((o) => o.trim().toLowerCase() === wanted);
  return idx >= 0 ? { letters: [idx], remainder: '' } : { letters: [], remainder: text.trim() };
}

function joinExplanation(parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface Candidate {
  line: number;
  number: number;
  text: string;
}

export function parseQuestionText(input: string): ParsedDraft[] {
  const lines = input.replace(/\r\n?/g, '\n').split('\n').map(cleanLine);

  // 1. Split into the questions area and an optional answer-key area.
  let keyStart = -1;
  let keyEnd = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (isKeyHeader(lines[i])) {
      keyStart = i;
      break;
    }
  }
  if (keyStart >= 0) {
    for (let i = keyStart + 1; i < lines.length; i++) {
      if (HEADER.test(lines[i]) && !isKeyHeader(lines[i])) {
        keyEnd = i;
        break;
      }
    }
  }
  const mainEnd = keyStart >= 0 ? keyStart : lines.length;

  // 2. Numbered lines are only real questions when options follow before the next numbered line.
  const boundaries = new Set<number>();
  const candidates: Candidate[] = [];
  for (let i = 0; i < mainEnd; i++) {
    if (HEADER.test(lines[i])) {
      boundaries.add(i);
      continue;
    }
    const m = Q_START.exec(lines[i]);
    if (m) candidates.push({ line: i, number: Number(m[1]), text: (m[2] ?? '').trim() });
  }

  const nextStop = (from: number, candidateLines: number[]): number => {
    for (let i = from + 1; i < mainEnd; i++) {
      if (boundaries.has(i) || candidateLines.includes(i)) return i;
    }
    return mainEnd;
  };

  const allLines = candidates.map((c) => c.line);
  const real = candidates.filter((c) => {
    if (splitQuestionLineOptions(c.text)) return true;
    const stop = nextStop(c.line, allLines);
    for (let i = c.line + 1; i < stop; i++) {
      const o = OPT_START.exec(lines[i]);
      if (o && o[1].toUpperCase() === 'A') return true;
    }
    return false;
  });
  const realLines = real.map((c) => c.line);

  // 3. Parse each question block.
  const drafts: ParsedDraft[] = real.map((c) => {
    const end = nextStop(c.line, realLines);
    const draft: ParsedDraft = { number: c.number, question: '', options: [], correct: [], explanation: '', errors: [] };
    const questionParts: string[] = [];
    const explanationParts: string[] = [];
    let answerFound = false;
    let explanationStarted = false;
    let optionsUpper = true;
    let lastWasOption = false;

    const inline = splitQuestionLineOptions(c.text);
    if (inline) {
      questionParts.push(inline.question);
      draft.options.push(...inline.options);
      lastWasOption = true;
    } else if (c.text) {
      questionParts.push(c.text);
    }

    for (let i = c.line + 1; i < end; i++) {
      const line = lines[i];
      if (!line.trim()) {
        lastWasOption = false;
        if (answerFound || explanationStarted) explanationParts.push('');
        continue;
      }
      if (META_LINE.test(line)) {
        const obj = OBJECTIVE_IN_LINE.exec(line);
        const dom = DOMAIN_IN_LINE.exec(line);
        if (obj) draft.objective = obj[1];
        if (dom) draft.domain = `${dom[1]}.0` as DomainId;
        if (obj || dom) continue;
      }
      if (!answerFound) {
        const ans = ANSWER.exec(line);
        if (ans) {
          const { letters, remainder } = answerFromText(ans[1], draft.options);
          if (letters.length > 0) {
            draft.correct = letters;
            answerFound = true;
            lastWasOption = false;
            if (remainder) explanationParts.push(remainder);
            continue;
          }
        }
      }
      const expl = EXPLANATION.exec(line);
      if (expl) {
        explanationStarted = true;
        lastWasOption = false;
        if (expl[1]) explanationParts.push(expl[1]);
        continue;
      }
      if (!answerFound && !explanationStarted) {
        const opt = OPT_START.exec(line);
        const expected = LETTERS[draft.options.length];
        if (opt && expected && opt[1].toUpperCase() === expected) {
          if (draft.options.length === 0) optionsUpper = opt[1] === opt[1].toUpperCase();
          draft.options.push(...splitInlineOptions(opt[2], draft.options.length, optionsUpper));
          lastWasOption = true;
          continue;
        }
        if (draft.options.length === 0) {
          questionParts.push(line.trim());
          continue;
        }
        if (lastWasOption) {
          draft.options[draft.options.length - 1] += ' ' + line.trim();
          continue;
        }
      }
      explanationParts.push(line);
    }

    draft.question = questionParts.join('\n').trim();
    draft.explanation = joinExplanation(explanationParts);
    const choose = CHOOSE.exec(draft.question);
    if (choose) draft.selectCount = COUNT_WORDS[choose[1].toLowerCase()];
    return draft;
  });

  // 4. Answer-key section: "1. Respuesta correcta: b)" followed by explanation lines.
  if (keyStart >= 0) {
    const byNumber = new Map(drafts.map((d) => [d.number, d]));
    const filledFromKey = new Set<number>();
    let current: { draft: ParsedDraft; parts: string[] } | null = null;
    const flush = () => {
      if (!current) return;
      const extra = joinExplanation(current.parts);
      if (extra) {
        current.draft.explanation = current.draft.explanation ? `${current.draft.explanation}\n\n${extra}` : extra;
      }
      current = null;
    };
    for (let i = keyStart + 1; i < keyEnd; i++) {
      const line = lines[i];
      const m = KEY_ENTRY.exec(line);
      if (m) {
        const draft = byNumber.get(Number(m[1]));
        if (draft && !filledFromKey.has(draft.number)) {
          const body = m[2] ?? '';
          const labelled = ANSWER.exec(body);
          const { letters, remainder } = answerFromText(labelled ? labelled[1] : body, draft.options);
          if (letters.length > 0) {
            flush();
            filledFromKey.add(draft.number);
            if (draft.correct.length === 0) draft.correct = letters;
            current = { draft, parts: remainder ? [remainder] : [] };
            continue;
          }
        }
      }
      if (current) {
        const expl = EXPLANATION.exec(line);
        current.parts.push(expl ? expl[1] : line);
      }
    }
    flush();
  }

  // 5. Final checks and derived fields.
  for (const d of drafts) {
    if (d.objective && !d.domain) d.domain = domainFromObjective(d.objective);
    if (d.options.length < 2) d.errors.push('found fewer than 2 options');
    if (d.correct.length === 0) {
      d.errors.push('no answer found (expected a line like "Answer: B")');
    } else {
      const bad = d.correct.filter((i) => i >= d.options.length);
      if (bad.length) {
        d.errors.push(
          `answer ${bad.map((i) => LETTERS[i]).join(', ')} does not exist (only ${d.options.length} options)`,
        );
      }
    }
    if (d.selectCount !== undefined && d.correct.length > 0 && d.selectCount !== d.correct.length) {
      d.errors.push(`the question says choose ${d.selectCount} but the answer lists ${d.correct.length}`);
    }
  }
  return drafts;
}

/**
 * Builds seed/netplus-1000.json from content/generate.ts and content/packs/*.ts.
 * Run: npm run questions:build   (add --partial while the bank is still being written)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DOMAIN_IDS } from '../shared/domains';
import { questionHash } from '../shared/hash';
import { classifyBatch } from '../shared/importer';
import { seededRng, shuffled } from '../shared/random';
import { mustKeepOrder } from '../shared/shuffle';
import { generatedQuestions } from './generate';
import type { Raw } from './types';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '..', 'seed', 'netplus-1000.json');
const partial = process.argv.includes('--partial');

/** Questions per objective; each domain adds up to its exam weight x 1000. */
export const TARGETS: Record<string, number> = {
  '1.1': 25, '1.2': 30, '1.3': 25, '1.4': 45, '1.5': 25, '1.6': 20, '1.7': 45, '1.8': 15,
  '2.1': 55, '2.2': 60, '2.3': 60, '2.4': 25,
  '3.1': 40, '3.2': 40, '3.3': 35, '3.4': 45, '3.5': 30,
  '4.1': 50, '4.2': 50, '4.3': 40,
  '5.1': 30, '5.2': 50, '5.3': 55, '5.4': 45, '5.5': 60,
};
const DIFF = { e: 'easy', m: 'medium', h: 'hard' } as const;
const COUNT_WORDS: Record<string, number> = { TWO: 2, THREE: 3 };

async function loadPacks(): Promise<{ file: string; raws: Raw[] }[]> {
  const dir = path.join(here, 'packs');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ts')).sort();
  const out = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(path.join(dir, f)).href);
    out.push({ file: f, raws: mod.default as Raw[] });
  }
  return out;
}

function check(raw: Raw, where: string, problems: string[]) {
  const [objective, diff, , question, right, wrong, explanation, whyWrong] = raw;
  const rights = Array.isArray(right) ? right : [right];
  if (!(objective in TARGETS)) problems.push(`${where}: unknown objective ${objective}`);
  if (!(diff in DIFF)) problems.push(`${where}: bad difficulty ${diff}`);
  if (wrong.length !== whyWrong.length) problems.push(`${where}: ${wrong.length} wrong options but ${whyWrong.length} reasons`);
  if (rights.length + wrong.length < 4) problems.push(`${where}: fewer than 4 options`);
  const all = [...rights, ...wrong].map((o) => o.trim().toLowerCase());
  if (new Set(all).size !== all.length) problems.push(`${where}: repeated option text`);
  if (!explanation.trim()) problems.push(`${where}: empty explanation`);
  const choose = /\(Choose (TWO|THREE)\)/.exec(question);
  if (rights.length > 1 && (!choose || COUNT_WORDS[choose[1]] !== rights.length)) {
    problems.push(`${where}: ${rights.length} right answers but the text says ${choose ? choose[0] : 'nothing'}`);
  }
  if (rights.length === 1 && choose) problems.push(`${where}: says ${choose[0]} but has one right answer`);
}

function expand(raw: Raw, rng: () => number) {
  const [objective, diff, tags, question, right, wrong, explanation, whyWrong] = raw;
  const rights = Array.isArray(right) ? right : [right];
  const options = [...rights, ...wrong];
  const reasons = [...rights.map(() => ''), ...whyWrong];
  const order = mustKeepOrder({ options }) ? options.map((_, i) => i) : shuffled(options.map((_, i) => i), rng);
  return {
    domain: `${objective.split('.')[0]}.0`,
    objective,
    type: rights.length > 1 ? 'multiple' : 'single',
    question,
    options: order.map((i) => options[i]),
    correct: order.map((orig, pos) => (orig < rights.length ? pos : -1)).filter((i) => i >= 0),
    selectCount: rights.length,
    explanation,
    optionExplanations: order.map((i) => reasons[i]),
    tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    difficulty: DIFF[diff],
    source: 'netplus-1000',
  };
}

async function main() {
  const sources = [{ file: 'generate.ts', raws: generatedQuestions() }, ...(await loadPacks())];
  const problems: string[] = [];
  const seen = new Map<string, string>();
  const seedQuestions = JSON.parse(fs.readFileSync(path.join(here, '..', 'seed', 'seed-questions.json'), 'utf8')) as { question: string }[];
  for (const q of seedQuestions) seen.set(questionHash(q.question), 'seed-questions.json');

  const rng = seededRng(1000);
  const expanded: ReturnType<typeof expand>[] = [];
  for (const { file, raws } of sources) {
    raws.forEach((raw, i) => {
      const where = `${file}#${i + 1}`;
      check(raw, where, problems);
      const h = questionHash(raw[3]);
      if (seen.has(h)) problems.push(`${where}: duplicate question text (also in ${seen.get(h)})`);
      else seen.set(h, where);
      expanded.push(expand(raw, rng));
    });
  }

  const results = classifyBatch(expanded, new Set());
  results.forEach((r, i) => {
    if (r.status === 'invalid') problems.push(`item ${i + 1}: ${r.errors.join('; ')}`);
  });

  const perObjective: Record<string, number> = {};
  for (const q of expanded) perObjective[q.objective] = (perObjective[q.objective] ?? 0) + 1;
  const lines = Object.keys(TARGETS).map((o) => {
    const have = perObjective[o] ?? 0;
    return `${o}: ${String(have).padStart(3)} / ${TARGETS[o]}${have === TARGETS[o] ? '' : have > TARGETS[o] ? '  OVER' : '  missing ' + (TARGETS[o] - have)}`;
  });
  console.log(lines.join('\n'));
  for (const d of DOMAIN_IDS) {
    console.log(`domain ${d}: ${expanded.filter((q) => q.domain === d).length}`);
  }
  const diffs = ['easy', 'medium', 'hard'].map((d) => `${d} ${expanded.filter((q) => q.difficulty === d).length}`);
  const multi = expanded.filter((q) => q.type === 'multiple').length;
  console.log(`total ${expanded.length} · ${diffs.join(' · ')} · multiple-answer ${multi}`);
  const firstPos = [0, 1, 2, 3].map((p) => expanded.filter((q) => q.correct[0] === p).length);
  console.log(`correct answer position A/B/C/D: ${firstPos.join(' / ')}`);

  const countMismatch = Object.keys(TARGETS).some((o) => (perObjective[o] ?? 0) !== TARGETS[o]);
  if (problems.length) {
    console.error(`\n${problems.length} problem(s):\n` + problems.join('\n'));
    process.exit(1);
  }
  if (countMismatch && !partial) {
    console.error('\nObjective counts do not match the targets (use --partial while writing).');
    process.exit(1);
  }
  fs.writeFileSync(OUT, JSON.stringify(expanded, null, 1) + '\n');
  console.log(`\nwrote ${path.relative(process.cwd(), OUT)}`);
}

main();

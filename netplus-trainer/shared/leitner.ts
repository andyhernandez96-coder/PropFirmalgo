import { addDays } from './dates';
import type { LeitnerCard } from './schema';

/** Days until the next review for boxes 1..5. */
export const BOX_INTERVAL_DAYS = [1, 2, 4, 8, 16] as const;

function scheduled(box: number, today: string): LeitnerCard {
  return { box, lastReviewed: today, due: addDays(today, BOX_INTERVAL_DAYS[box - 1]) };
}

/**
 * - First answer ever: correct -> box 2, wrong -> box 1.
 * - Wrong answer: always back to box 1.
 * - Correct answer: moves up one box only when the card was due; answering early changes nothing.
 */
export function reviewCard(card: LeitnerCard | undefined, correct: boolean, today: string): LeitnerCard {
  if (!correct) return scheduled(1, today);
  if (!card) return scheduled(2, today);
  if (card.due > today) return card;
  return scheduled(Math.min(card.box + 1, 5), today);
}

export function isDue(card: LeitnerCard, today: string): boolean {
  return card.due <= today;
}

export function dueQuestionIds(
  leitner: Readonly<Record<string, LeitnerCard>>,
  today: string,
  existingIds?: ReadonlySet<string>,
): string[] {
  return Object.entries(leitner)
    .filter(([id, card]) => isDue(card, today) && (!existingIds || existingIds.has(id)))
    .sort(([, a], [, b]) => a.box - b.box || a.due.localeCompare(b.due))
    .map(([id]) => id);
}

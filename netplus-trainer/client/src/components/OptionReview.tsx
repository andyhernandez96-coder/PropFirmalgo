import { LETTERS } from './ui';

/** Read-only list of options with the correct ones marked (bank, import preview, results). */
export function OptionReview({
  options,
  correct,
  selected,
  optionExplanations,
}: {
  options: string[];
  correct: number[];
  selected?: number[];
  optionExplanations?: string[];
}) {
  return (
    <ol className="space-y-1.5">
      {options.map((text, i) => {
        const isCorrect = correct.includes(i);
        const isPicked = selected?.includes(i) ?? false;
        const tone = isCorrect
          ? 'border-good/60 bg-good/10'
          : isPicked
            ? 'border-bad/60 bg-bad/10'
            : 'border-line';
        const why = optionExplanations?.[i]?.trim();
        return (
          <li key={i} className={`border rounded-md px-3 py-2 ${tone}`}>
            <div className="flex gap-2">
              <span className="font-semibold text-muted w-5 shrink-0">{LETTERS[i]}</span>
              <span className="flex-1">{text}</span>
              {isCorrect && <span className="text-good text-sm font-medium">✓ correct</span>}
              {!isCorrect && isPicked && <span className="text-bad text-sm font-medium">✗ your answer</span>}
              {isCorrect && isPicked && <span className="text-good text-sm">(your answer)</span>}
            </div>
            {why && <p className="text-sm text-muted mt-1 ml-7 whitespace-pre-line">{why}</p>}
          </li>
        );
      })}
    </ol>
  );
}

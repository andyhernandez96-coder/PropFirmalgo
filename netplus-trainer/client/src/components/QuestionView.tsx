import type { PresentedQuestion } from '../../../shared/shuffle';
import { numberWord } from '../format';
import { OptionReview } from './OptionReview';
import { Badge, DomainBadge, LETTERS } from './ui';

/** One question on screen: clickable options before answering, marked options after. */
export function QuestionView({
  presented,
  selected,
  onToggle,
  revealed,
  showDomain,
  flagged,
  showExplanations = true,
}: {
  presented: PresentedQuestion;
  selected: number[];
  onToggle: (index: number) => void;
  revealed: boolean;
  showDomain: boolean;
  flagged: boolean;
  showExplanations?: boolean;
}) {
  const q = presented.question;
  const multiple = q.selectCount > 1;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {showDomain && <DomainBadge domain={q.domain} />}
        {showDomain && q.objective && <Badge>Obj {q.objective}</Badge>}
        {multiple && <Badge tone="warn">Choose {numberWord(q.selectCount)}</Badge>}
        {flagged && <Badge tone="warn">⚑ Flagged</Badge>}
      </div>
      <p className="text-lg whitespace-pre-line mb-5">{q.question}</p>
      {revealed ? (
        <OptionReview
          options={presented.options}
          correct={presented.correct}
          selected={selected}
          optionExplanations={showExplanations ? presented.optionExplanations : undefined}
        />
      ) : (
        <ol className="space-y-2" role={multiple ? 'group' : 'radiogroup'}>
          {presented.options.map((text, i) => {
            const isSelected = selected.includes(i);
            return (
              <li key={i}>
                <button
                  type="button"
                  role={multiple ? 'checkbox' : 'radio'}
                  aria-checked={isSelected}
                  onClick={() => onToggle(i)}
                  className={`w-full text-left flex gap-3 items-start border rounded-md px-4 py-3 ${
                    isSelected ? 'border-accent bg-accent/15' : 'border-line hover:bg-raised'
                  }`}
                >
                  <span
                    className={`mt-0.5 shrink-0 w-6 h-6 flex items-center justify-center text-sm font-semibold border ${
                      multiple ? 'rounded' : 'rounded-full'
                    } ${isSelected ? 'bg-accent text-accent-ink border-accent' : 'border-line text-muted'}`}
                  >
                    {LETTERS[i]}
                  </span>
                  <span className="flex-1">{text}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

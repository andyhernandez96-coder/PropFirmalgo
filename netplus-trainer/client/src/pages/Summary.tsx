import { DOMAINS } from '../../../shared/domains';
import { MODE_LABELS } from '../../../shared/schema';
import { OptionReview } from '../components/OptionReview';
import { Badge, Button, Card, DomainBadge, Notice, PageTitle } from '../components/ui';
import { formatDuration } from '../format';
import type { SessionResult } from '../session';

export function SummaryPage({ result, onBack }: { result: SessionResult; onBack: () => void }) {
  const { session, items } = result;
  const review = items.filter((it) => it.answered && (!it.correct || it.flagged));
  const skipped = items.filter((it) => !it.answered).length;

  return (
    <div className="max-w-3xl mx-auto">
      <PageTitle sub={`${MODE_LABELS[session.mode]} · ${formatDuration(session.durationSec)}`}>Session complete</PageTitle>
      {result.saveError && (
        <div className="mb-4">
          <Notice tone="bad">Some data could not be saved: {result.saveError}</Notice>
        </div>
      )}
      <Card className="p-6 mb-5">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="text-5xl font-semibold">{session.scorePct}%</p>
            <p className="text-muted">
              {session.correct} of {session.total} correct
              {skipped > 0 && ` · ${skipped} not answered (not counted)`}
            </p>
          </div>
        </div>
        <table className="w-full mt-6 text-sm">
          <thead>
            <tr className="text-muted text-left">
              <th className="py-1 font-medium">Domain</th>
              <th className="py-1 font-medium text-right">Correct</th>
              <th className="py-1 font-medium text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {DOMAINS.map((d) => {
              const t = session.byDomain[d.id];
              if (!t || t.total === 0) return null;
              return (
                <tr key={d.id} className="border-t border-line">
                  <td className="py-2">
                    {d.id} {d.name}
                  </td>
                  <td className="py-2 text-right">
                    {t.correct}/{t.total}
                  </td>
                  <td className="py-2 text-right">{Math.round((t.correct / t.total) * 100)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {session.total === 0 && <Notice tone="warn">You ended the session without submitting any answer, so nothing was recorded.</Notice>}

      {review.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3">Review ({review.length})</h2>
          <div className="space-y-4">
            {review.map((it, i) => (
              <Card key={i} className="p-5">
                <div className="flex flex-wrap gap-2 mb-2">
                  <DomainBadge domain={it.presented.question.domain} />
                  {it.correct ? <Badge tone="good">Correct</Badge> : <Badge tone="bad">Missed</Badge>}
                  {it.flagged && <Badge tone="warn">⚑ Flagged</Badge>}
                </div>
                <p className="whitespace-pre-line mb-3">{it.presented.question.question}</p>
                <OptionReview
                  options={it.presented.options}
                  correct={it.presented.correct}
                  selected={it.selected}
                  optionExplanations={it.presented.optionExplanations}
                />
                {it.presented.question.explanation && (
                  <p className="mt-3 border-l-2 border-accent pl-3 whitespace-pre-line text-sm">{it.presented.question.explanation}</p>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      <div className="mt-6">
        <Button variant="primary" onClick={onBack}>
          Back to Study
        </Button>
      </div>
    </div>
  );
}

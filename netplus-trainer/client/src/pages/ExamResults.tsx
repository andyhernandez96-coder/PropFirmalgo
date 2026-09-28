import { useState } from 'react';
import { PASSING_SCALED } from '../../../shared/scoring';
import { DomainBars } from '../components/DomainBars';
import { OptionReview } from '../components/OptionReview';
import { Badge, Button, Card, DomainBadge, Notice, PageTitle, Tabs } from '../components/ui';
import { formatDuration } from '../format';
import type { SessionResult } from '../session';

type Filter = 'all' | 'incorrect' | 'unanswered' | 'flagged';

/** 720 on the linear 100–900 estimate corresponds to 77.5% correct. */
const PASS_PERCENT = ((PASSING_SCALED - 100) / 800) * 100;

export function ExamResultsPage({ result, onBack }: { result: SessionResult; onBack: () => void }) {
  const { session, items } = result;
  const [filter, setFilter] = useState<Filter>('incorrect');
  const scaled = session.estimatedScaled ?? 100;
  const above = scaled >= PASSING_SCALED;
  const unanswered = items.filter((it) => !it.answered).length;

  const list = items
    .map((it, i) => ({ it, n: i + 1 }))
    .filter(({ it }) =>
      filter === 'all' ? true : filter === 'incorrect' ? !it.correct : filter === 'unanswered' ? !it.answered : it.flagged,
    );

  return (
    <div className="max-w-4xl mx-auto">
      <PageTitle sub={`${items.length} questions · ${formatDuration(session.durationSec)}${result.timedOut ? ' · time ran out' : ''}`}>
        Exam results
      </PageTitle>
      {result.saveError && (
        <div className="mb-4">
          <Notice tone="bad">Some data could not be saved: {result.saveError}</Notice>
        </div>
      )}
      {result.timedOut && (
        <div className="mb-4">
          <Notice tone="warn">Time ran out. The exam was submitted automatically with the answers you had.</Notice>
        </div>
      )}

      <Card className="p-6 mb-5">
        <div className="flex flex-wrap items-end gap-8">
          <div>
            <p className="text-sm text-muted">Estimated score</p>
            <p className={`text-5xl font-semibold tabular-nums ${above ? 'text-good' : 'text-bad'}`}>
              {scaled}
              <span className="text-2xl text-muted"> / 900</span>
            </p>
            <p className={`font-medium mt-1 ${above ? 'text-good' : 'text-bad'}`}>
              {above ? `At or above the ${PASSING_SCALED} passing line` : `Below the ${PASSING_SCALED} passing line`}
            </p>
          </div>
          <div>
            <p className="text-3xl font-semibold tabular-nums">{session.scorePct}%</p>
            <p className="text-muted">
              {session.correct} of {session.total} correct
              {unanswered > 0 && ` · ${unanswered} blank`}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted mt-4">
          Estimate, not the official scale. CompTIA does not publish how correct answers convert to the 100–900 scale, and real
          questions are weighted differently. This app uses a straight line: 100 + 800 × % correct, so {PASSING_SCALED} ≈{' '}
          {PASS_PERCENT}% correct.
        </p>
      </Card>

      <Card className="p-6 mb-6">
        <h2 className="font-semibold mb-4">By domain</h2>
        <DomainBars rows={session.byDomain} passLine={PASS_PERCENT} />
      </Card>

      <h2 className="text-lg font-semibold mb-2">Review</h2>
      <Tabs
        tabs={[
          { id: 'incorrect', label: `Incorrect (${items.filter((it) => !it.correct).length})` },
          { id: 'unanswered', label: `Blank (${unanswered})` },
          { id: 'flagged', label: `Flagged (${items.filter((it) => it.flagged).length})` },
          { id: 'all', label: `All (${items.length})` },
        ]}
        active={filter}
        onChange={setFilter}
      />
      <div className="space-y-4">
        {list.map(({ it, n }) => (
          <Card key={n} className="p-5">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-semibold text-muted">#{n}</span>
              <DomainBadge domain={it.presented.question.domain} />
              {it.correct ? (
                <Badge tone="good">Correct</Badge>
              ) : it.answered ? (
                <Badge tone="bad">Incorrect</Badge>
              ) : (
                <Badge tone="warn">Not answered</Badge>
              )}
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
        {list.length === 0 && <p className="text-muted">Nothing in this list.</p>}
      </div>

      <div className="mt-6">
        <Button variant="primary" onClick={onBack}>
          Back to Study
        </Button>
      </div>
    </div>
  );
}

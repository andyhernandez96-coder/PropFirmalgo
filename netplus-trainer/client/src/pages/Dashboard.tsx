import { type ReactNode, useMemo, useState } from 'react';
import { localDay } from '../../../shared/dates';
import { domainName } from '../../../shared/domains';
import { MODE_LABELS } from '../../../shared/schema';
import { PASSING_SCALED } from '../../../shared/scoring';
import { accuracyByDomain, overallAccuracy, studyDaysFrom, studyStreak, weakestObjectives } from '../../../shared/stats';
import { DomainBars } from '../components/DomainBars';
import { TrendChart, type TrendPoint } from '../components/TrendChart';
import { Button, Card, PageTitle } from '../components/ui';
import { useData } from '../data';
import { formatDuration } from '../format';
import { buildSrsConfig, countDue, type SessionConfig } from '../session';

const PASS_PERCENT = ((PASSING_SCALED - 100) / 800) * 100;

function StatTile({ label, value, sub, action }: { label: string; value: string; sub?: string; action?: ReactNode }) {
  return (
    <Card className="p-4 flex flex-col">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-3xl font-semibold mt-1">{value}</p>
      {sub && <p className="text-sm text-muted mt-1">{sub}</p>}
      {action && <div className="mt-3">{action}</div>}
    </Card>
  );
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function DashboardPage({ onStart }: { onStart: (config: SessionConfig) => void }) {
  const { questions, attempts, leitner, sessions, today } = useData();
  const [showAll, setShowAll] = useState(false);
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);

  const overall = overallAccuracy(attempts);
  const due = countDue(questions, leitner, today);
  const streak = studyStreak(
    studyDaysFrom([...attempts.map((a) => a.answeredAt), ...sessions.map((s) => s.endedAt)]),
    localDay(),
  );
  const domains = useMemo(() => accuracyByDomain(attempts, byId), [attempts, byId]);
  const weakest = useMemo(() => weakestObjectives(attempts, byId, 5), [attempts, byId]);
  const history = useMemo(() => [...sessions].sort((a, b) => b.endedAt.localeCompare(a.endedAt)), [sessions]);
  const exams = history.filter((s) => s.mode === 'exam' && s.estimatedScaled !== undefined).slice(0, 10).reverse();
  const trend: TrendPoint[] = exams.map((s) => ({
    label: shortDate(s.endedAt),
    value: s.estimatedScaled!,
    detail: `${s.correct}/${s.total} correct (${s.scorePct}%) · ${formatDuration(s.durationSec)}`,
  }));
  const rows = showAll ? history : history.slice(0, 12);

  return (
    <div>
      <PageTitle sub="Your progress toward the N10-009 exam.">Dashboard</PageTitle>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatTile
          label="Overall accuracy"
          value={overall.total ? `${Math.round((overall.correct / overall.total) * 100)}%` : '—'}
          sub={overall.total ? `${overall.correct} of ${overall.total} answers correct` : 'No answers yet'}
        />
        <StatTile
          label="Due for review today"
          value={String(due)}
          sub={due ? 'Spaced repetition' : 'Nothing due right now'}
          action={
            <Button variant="primary" size="sm" disabled={due === 0} onClick={() => onStart(buildSrsConfig(questions, leitner, today))}>
              {due} due today — review
            </Button>
          }
        />
        <StatTile label="Study streak" value={`${streak} day${streak === 1 ? '' : 's'}`} sub={streak ? 'Keep it going' : 'Answer a question to start one'} />
        <StatTile label="Questions in bank" value={String(questions.length)} sub={`${questions.filter((q) => leitner[q.id]).length} answered at least once`} />
      </div>

      <div className="grid lg:grid-cols-[3fr_2fr] gap-5 mb-5">
        <Card className="p-5">
          <h2 className="font-semibold mb-4">Accuracy by domain</h2>
          <DomainBars rows={domains} passLine={PASS_PERCENT} />
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Weakest objectives</h2>
          {weakest.length === 0 ? (
            <p className="text-muted text-sm">
              Nothing to show yet. This lists objectives you have missed; it needs questions that include an "objective" field.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-left">
                  <th className="font-medium py-1">Objective</th>
                  <th className="font-medium py-1 text-right">Accuracy</th>
                  <th className="font-medium py-1 text-right">Answers</th>
                </tr>
              </thead>
              <tbody>
                {weakest.map((w) => (
                  <tr key={w.objective} className="border-t border-line">
                    <td className="py-2">
                      <span className="font-medium">{w.objective}</span>{' '}
                      <span className="text-muted text-xs">{domainName(w.domain)}</span>
                    </td>
                    <td className="py-2 text-right tabular-nums">{Math.round(w.accuracy * 100)}%</td>
                    <td className="py-2 text-right tabular-nums">
                      {w.correct}/{w.attempts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card className="p-5 mb-5">
        <h2 className="font-semibold">Estimated score, last {exams.length || 10} exam simulations</h2>
        <p className="text-xs text-muted mb-3">Estimate on the 100–900 scale, not the official one. The table below has every value.</p>
        {trend.length === 0 ? <p className="text-muted text-sm">Take an Exam Simulation to see your trend here.</p> : <TrendChart points={trend} />}
      </Card>

      <Card>
        <div className="px-5 py-4 flex items-center">
          <h2 className="font-semibold">Session history</h2>
          <span className="text-sm text-muted ml-3">{history.length} sessions</span>
        </div>
        {history.length === 0 ? (
          <p className="px-5 pb-5 text-muted text-sm">No sessions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-left border-t border-line">
                  <th className="font-medium px-5 py-2">Date</th>
                  <th className="font-medium px-5 py-2">Mode</th>
                  <th className="font-medium px-5 py-2 text-right">Score</th>
                  <th className="font-medium px-5 py-2 text-right">Estimated</th>
                  <th className="font-medium px-5 py-2 text-right">Duration</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="px-5 py-2">{new Date(s.endedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td className="px-5 py-2">{MODE_LABELS[s.mode]}</td>
                    <td className="px-5 py-2 text-right tabular-nums">
                      {s.scorePct}% <span className="text-muted">({s.correct}/{s.total})</span>
                    </td>
                    <td className="px-5 py-2 text-right tabular-nums">{s.estimatedScaled ?? '—'}</td>
                    <td className="px-5 py-2 text-right tabular-nums">{formatDuration(s.durationSec)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.length > 12 && (
              <div className="px-5 py-3 border-t border-line">
                <Button size="sm" variant="ghost" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? 'Show fewer' : `Show all ${history.length}`}
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

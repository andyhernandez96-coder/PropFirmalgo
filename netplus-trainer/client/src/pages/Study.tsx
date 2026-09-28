import { type ReactNode, useMemo, useState } from 'react';
import { pickExamQuestions, allocateByWeight } from '../../../shared/distribution';
import { DOMAINS, DOMAIN_IDS, type DomainId, EXAM_DEFAULT_MINUTES, EXAM_DEFAULT_QUESTIONS } from '../../../shared/domains';
import { sample, shuffled } from '../../../shared/random';
import { selectWeakSpots } from '../../../shared/stats';
import { Button, Card, DomainSelect, inputClass, Notice, PageTitle } from '../components/ui';
import { useData } from '../data';
import { buildSrsConfig, countDue, type SessionConfig } from '../session';
import { BOX_INTERVAL_DAYS } from '../../../shared/leitner';

function CountInput({ value, onChange, max }: { value: number; onChange: (n: number) => void; max: number }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-sm text-muted">Questions</span>
      <input
        type="number"
        min={1}
        max={Math.max(1, max)}
        className={`${inputClass} w-24`}
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
      />
      <span className="text-sm text-muted">of {max} available</span>
    </label>
  );
}

function ModeCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-muted text-sm mb-4">{description}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </Card>
  );
}

export function StudyPage({ onStart }: { onStart: (config: SessionConfig) => void }) {
  const { questions, stats, leitner, today } = useData();
  const due = countDue(questions, leitner, today);
  const nextDue = Object.entries(leitner)
    .filter(([id]) => questions.some((q) => q.id === id))
    .map(([, c]) => c.due)
    .filter((d) => d > today)
    .sort()[0];

  const [practiceCount, setPracticeCount] = useState(20);
  const [practiceDomain, setPracticeDomain] = useState('');
  const practicePool = useMemo(
    () => (practiceDomain ? questions.filter((q) => q.domain === practiceDomain) : questions),
    [questions, practiceDomain],
  );

  const [weakCount, setWeakCount] = useState(20);
  const weakPool = useMemo(() => selectWeakSpots(questions, stats, Number.MAX_SAFE_INTEGER), [questions, stats]);

  const [drillDomain, setDrillDomain] = useState<string>(DOMAINS[0].id);
  const [drillObjective, setDrillObjective] = useState('');
  const [drillCount, setDrillCount] = useState(15);
  const drillObjectives = useMemo(
    () =>
      [...new Set(questions.filter((q) => q.domain === drillDomain && q.objective).map((q) => q.objective!))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    [questions, drillDomain],
  );
  const drillPool = useMemo(
    () => questions.filter((q) => q.domain === drillDomain && (!drillObjective || q.objective === drillObjective)),
    [questions, drillDomain, drillObjective],
  );

  const [examCount, setExamCount] = useState(EXAM_DEFAULT_QUESTIONS);
  const [examMinutes, setExamMinutes] = useState(EXAM_DEFAULT_MINUTES);
  const examPreview = useMemo(() => {
    const available = Object.fromEntries(
      DOMAIN_IDS.map((d) => [d, questions.filter((q) => q.domain === d).length]),
    ) as Record<DomainId, number>;
    return allocateByWeight(examCount, available);
  }, [questions, examCount]);

  return (
    <div>
      <PageTitle sub="Pick a mode. Every mode except the exam shows the answer and explanation right after you submit.">Study</PageTitle>
      <div className="grid gap-4">
        <Card className="p-5 border-accent/60">
          <h2 className="text-lg font-semibold">Exam Simulation</h2>
          <p className="text-muted text-sm mb-4">
            Questions split by the real domain weights, a countdown timer and no feedback until the end — like test day.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <CountInput value={examCount} onChange={setExamCount} max={questions.length} />
            <label className="flex items-center gap-2">
              <span className="text-sm text-muted">Minutes</span>
              <input
                type="number"
                min={1}
                className={`${inputClass} w-24`}
                value={examMinutes}
                onChange={(e) => setExamMinutes(Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
            <Button
              variant="primary"
              disabled={examPreview.total === 0}
              onClick={() => {
                const picked = pickExamQuestions(questions, examCount);
                onStart({
                  mode: 'exam',
                  title: 'Exam Simulation',
                  feedback: false,
                  questions: picked.questions,
                  timeLimitSec: examMinutes * 60,
                });
              }}
            >
              Start exam
            </Button>
          </div>
          <p className="text-sm text-muted mt-3">
            Mix: {DOMAINS.map((d) => `${d.id} → ${examPreview.perDomain[d.id]}`).join(' · ')}
          </p>
          {examPreview.warnings.length > 0 && (
            <div className="mt-3">
              <Notice tone="warn">
                <ul className="list-disc ml-5 text-sm">
                  {examPreview.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </Notice>
            </div>
          )}
        </Card>

        <ModeCard
          title="Spaced Repetition"
          description={`Leitner system with 5 boxes (review after ${BOX_INTERVAL_DAYS.join(', ')} days). Right answers move a question up a box; a miss sends it back to box 1. Questions join the schedule the first time you answer them.`}
        >
          <Button variant="primary" disabled={due === 0} onClick={() => onStart(buildSrsConfig(questions, leitner, today))}>
            {due} due today
          </Button>
          {due === 0 && (
            <span className="text-sm text-muted">
              {nextDue ? `Nothing due. Next review: ${nextDue}.` : 'Nothing scheduled yet — answer some questions first.'}
            </span>
          )}
        </ModeCard>

        <ModeCard title="Practice" description="Random questions with immediate feedback.">
          <DomainSelect value={practiceDomain} onChange={setPracticeDomain} allowAll />
          <CountInput value={practiceCount} onChange={setPracticeCount} max={practicePool.length} />
          <Button
            variant="primary"
            disabled={practicePool.length === 0}
            onClick={() =>
              onStart({ mode: 'practice', title: 'Practice', feedback: true, questions: sample(practicePool, practiceCount) })
            }
          >
            Start practice
          </Button>
        </ModeCard>

        <ModeCard
          title="Weak Spots"
          description="Only questions you have missed before, starting with your lowest accuracy."
        >
          <CountInput value={weakCount} onChange={setWeakCount} max={weakPool.length} />
          <Button
            variant="primary"
            disabled={weakPool.length === 0}
            onClick={() =>
              onStart({ mode: 'weak', title: 'Weak Spots', feedback: true, questions: shuffled(weakPool.slice(0, weakCount)) })
            }
          >
            Start weak spots
          </Button>
          {weakPool.length === 0 && <span className="text-sm text-muted">No missed questions yet — practice first.</span>}
        </ModeCard>

        <ModeCard title="Domain Drill" description="Focus on one domain, or one objective inside it.">
          <DomainSelect
            value={drillDomain}
            onChange={(d) => {
              setDrillDomain(d);
              setDrillObjective('');
            }}
          />
          <select className={inputClass} value={drillObjective} onChange={(e) => setDrillObjective(e.target.value)}>
            <option value="">All objectives</option>
            {drillObjectives.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <CountInput value={drillCount} onChange={setDrillCount} max={drillPool.length} />
          <Button
            variant="primary"
            disabled={drillPool.length === 0}
            onClick={() =>
              onStart({
                mode: 'drill',
                title: `Domain Drill · ${drillObjective ? `Objective ${drillObjective}` : `Domain ${drillDomain}`}`,
                feedback: true,
                questions: sample(drillPool, drillCount),
              })
            }
          >
            Start drill
          </Button>
        </ModeCard>
      </div>
    </div>
  );
}

import { type ReactNode, useMemo, useState } from 'react';
import { DOMAINS } from '../../../shared/domains';
import { sample, shuffled } from '../../../shared/random';
import { selectWeakSpots } from '../../../shared/stats';
import { Button, Card, DomainSelect, inputClass, PageTitle } from '../components/ui';
import { useData } from '../data';
import type { SessionConfig } from '../session';

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
  const { questions, stats } = useData();

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

  return (
    <div>
      <PageTitle sub="Pick a mode. Every mode except the exam shows the answer and explanation right after you submit.">Study</PageTitle>
      <div className="grid gap-4">
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

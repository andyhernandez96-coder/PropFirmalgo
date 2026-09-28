import { useMemo, useState } from 'react';
import type { Question } from '../../../shared/schema';
import { api, errorText } from '../api';
import { useData } from '../data';
import { OptionReview } from '../components/OptionReview';
import { QuestionEditor } from '../components/QuestionEditor';
import { Badge, Button, Card, DomainBadge, DomainSelect, inputClass, Notice, PageTitle } from '../components/ui';

export function BankPage() {
  const { questions, reload } = useData();
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('');
  const [objective, setObjective] = useState('');
  const [tag, setTag] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Question | null>(null);
  const [error, setError] = useState<string | null>(null);

  const objectives = useMemo(
    () => [...new Set(questions.flatMap((q) => (q.objective ? [q.objective] : [])))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [questions],
  );
  const tags = useMemo(() => [...new Set(questions.flatMap((q) => q.tags ?? []))].sort(), [questions]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return questions.filter((q) => {
      if (domain && q.domain !== domain) return false;
      if (objective && q.objective !== objective) return false;
      if (tag && !q.tags?.includes(tag)) return false;
      if (needle) {
        const hay = [q.question, ...q.options, q.explanation, ...(q.tags ?? [])].join(' ').toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [questions, search, domain, objective, tag]);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const remove = async (q: Question) => {
    if (!window.confirm(`Delete this question?\n\n${q.question.slice(0, 160)}`)) return;
    try {
      await api.deleteQuestion(q.id);
      await reload();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div>
      <PageTitle sub={`${questions.length} questions in your bank`}>Question bank</PageTitle>
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          className={`${inputClass} flex-1 min-w-[220px]`}
          placeholder="Search text, options, explanation, tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <DomainSelect value={domain} onChange={setDomain} allowAll />
        <select className={inputClass} value={objective} onChange={(e) => setObjective(e.target.value)}>
          <option value="">All objectives</option>
          {objectives.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select className={inputClass} value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm text-muted mb-3">
        Showing {filtered.length} of {questions.length}
      </p>
      {error && (
        <div className="mb-3">
          <Notice tone="bad">{error}</Notice>
        </div>
      )}
      <div className="space-y-3">
        {filtered.map((q) => {
          const isOpen = open.has(q.id);
          return (
            <Card key={q.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <DomainBadge domain={q.domain} />
                {q.objective && <Badge>Obj {q.objective}</Badge>}
                {q.type === 'multiple' && <Badge tone="warn">Choose {q.selectCount}</Badge>}
                {q.difficulty && <Badge>{q.difficulty}</Badge>}
                {q.tags?.map((t) => (
                  <Badge key={t}>#{t}</Badge>
                ))}
                <div className="ml-auto flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => toggle(q.id)}>
                    {isOpen ? 'Hide' : 'Show'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(q)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="hover:!text-bad" onClick={() => void remove(q)}>
                    Delete
                  </Button>
                </div>
              </div>
              <button type="button" className="text-left w-full" onClick={() => toggle(q.id)}>
                <p className={`whitespace-pre-line ${isOpen ? '' : 'line-clamp-2'}`}>{q.question}</p>
              </button>
              {isOpen && (
                <div className="mt-3 space-y-3">
                  <OptionReview options={q.options} correct={q.correct} optionExplanations={q.optionExplanations} />
                  {q.explanation && <p className="whitespace-pre-line text-sm border-l-2 border-accent pl-3">{q.explanation}</p>}
                  {q.source && <p className="text-xs text-muted">Source: {q.source}</p>}
                </div>
              )}
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-muted">No questions match these filters.</p>}
      </div>
      {editing && <QuestionEditor question={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

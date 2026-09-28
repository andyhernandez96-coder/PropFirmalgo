import { useEffect, useMemo, useRef, useState } from 'react';
import { estimateScaledScore, pct, tallyByDomain } from '../../../shared/scoring';
import type { Attempt, Session } from '../../../shared/schema';
import { isAnswerCorrect, presentQuestion, toOriginalIndexes } from '../../../shared/shuffle';
import { api, errorText } from '../api';
import { QuestionView } from '../components/QuestionView';
import { Badge, Button, Card, Modal, Notice } from '../components/ui';
import { useData } from '../data';
import { numberWord } from '../format';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { formatClock, useStopwatch } from '../hooks/useStopwatch';
import { newSessionId, type SessionConfig, type SessionItemResult, type SessionResult } from '../session';

function Navigator({
  total,
  current,
  answers,
  flags,
  needs,
  onJump,
}: {
  total: number;
  current: number;
  answers: number[][];
  flags: boolean[];
  needs: number[];
  onJump: (i: number) => void;
}) {
  const answered = answers.filter((a, i) => a.length === needs[i]).length;
  const flagged = flags.filter(Boolean).length;
  return (
    <Card className="p-4">
      <div className="flex flex-wrap gap-3 text-xs text-muted mb-3">
        <span>
          <span className="inline-block w-3 h-3 rounded-sm bg-accent/70 align-middle mr-1" /> Answered {answered}
        </span>
        <span>
          <span className="inline-block w-3 h-3 rounded-sm border border-line align-middle mr-1" /> Unanswered {total - answered}
        </span>
        <span>⚑ Flagged {flagged}</span>
      </div>
      <div className="grid grid-cols-10 gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const done = answers[i].length === needs[i];
          const partial = answers[i].length > 0 && !done;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onJump(i)}
              aria-label={`Question ${i + 1}${done ? ', answered' : ', unanswered'}${flags[i] ? ', flagged' : ''}`}
              className={`relative h-8 rounded text-xs font-medium border ${
                done ? 'bg-accent/70 border-accent text-accent-ink' : partial ? 'border-warn text-warn' : 'border-line text-muted'
              } ${i === current ? 'ring-2 ring-ink ring-offset-1 ring-offset-panel' : ''}`}
            >
              {i + 1}
              {flags[i] && <span className="absolute -top-1.5 -right-1 text-warn text-[11px]">⚑</span>}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export function SessionPage({ config, onFinish }: { config: SessionConfig; onFinish: (result: SessionResult) => void }) {
  const { reload } = useData();
  const exam = !config.feedback;
  const presented = useMemo(() => config.questions.map((q) => presentQuestion(q)), [config]);
  const needs = useMemo(() => presented.map((p) => p.question.selectCount), [presented]);
  const sessionId = useMemo(newSessionId, []);
  const startedAt = useMemo(() => new Date().toISOString(), []);
  const total = presented.length;

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[][]>(() => presented.map(() => []));
  const [submitted, setSubmitted] = useState<boolean[]>(() => presented.map(() => false));
  const [flags, setFlags] = useState<boolean[]>(() => presented.map(() => false));
  const [showExplanation, setShowExplanation] = useState(true);
  const [paused, setPaused] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const elapsed = useStopwatch(paused || finishing);
  const remaining = config.timeLimitSec !== undefined ? config.timeLimitSec - elapsed : undefined;
  const finished = useRef(false);

  const current = presented[index];
  const selected = answers[index];
  const isSubmitted = submitted[index];
  const need = needs[index];

  const gradeAt = (i: number) =>
    isAnswerCorrect(toOriginalIndexes(presented[i], answers[i]), presented[i].question.correct);
  const isAnswered = (i: number) => (exam ? answers[i].length > 0 : submitted[i]);

  const finish = async (timedOut = false) => {
    if (finished.current) return;
    finished.current = true;
    setFinishing(true);
    setConfirmFinish(false);
    const items: SessionItemResult[] = presented.map((p, i) => ({
      presented: p,
      selected: answers[i],
      answered: isAnswered(i),
      correct: isAnswered(i) && gradeAt(i),
      flagged: flags[i],
    }));
    // In the exam every question counts (blank = wrong); in practice only submitted ones do.
    const counted = exam ? items : items.filter((it) => it.answered);
    const correct = counted.filter((it) => it.correct).length;
    const session: Session = {
      id: sessionId,
      mode: config.mode,
      startedAt,
      endedAt: new Date().toISOString(),
      durationSec: config.timeLimitSec !== undefined ? Math.min(elapsed, config.timeLimitSec) : elapsed,
      total: counted.length,
      correct,
      scorePct: pct(correct, counted.length),
      byDomain: tallyByDomain(counted.map((it) => ({ domain: it.presented.question.domain, correct: it.correct }))),
      estimatedScaled: exam ? estimateScaledScore(counted.length ? correct / counted.length : 0) : undefined,
    };
    const errors: string[] = saveError ? [saveError] : [];
    if (exam) {
      // Blank questions are scored as wrong but not stored as attempts: they were never really answered.
      const attempts: Attempt[] = items
        .filter((it) => it.answered)
        .map((it) => ({
          questionId: it.presented.question.id,
          selected: toOriginalIndexes(it.presented, it.selected),
          correct: it.correct,
          mode: config.mode,
          sessionId,
          answeredAt: session.endedAt,
        }));
      if (attempts.length) await api.postAttempts(attempts).catch((err) => errors.push(errorText(err)));
    }
    if (counted.length > 0) await api.postSession(session).catch((err) => errors.push(errorText(err)));
    await reload();
    onFinish({ config, session, items, timedOut, saveError: errors.length ? errors.join(' · ') : undefined });
  };

  useEffect(() => {
    if (remaining !== undefined && remaining <= 0) void finish(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const toggleOption = (option: number) => {
    if (paused || isSubmitted || option >= current.options.length) return;
    let nextSelection: number[];
    if (need === 1) nextSelection = selected[0] === option && exam ? [] : [option];
    else if (selected.includes(option)) nextSelection = selected.filter((x) => x !== option);
    else if (selected.length >= need) {
      setHint(`You can only pick ${numberWord(need)}. Unselect one first.`);
      return;
    } else nextSelection = [...selected, option].sort((a, b) => a - b);
    setHint(null);
    setAnswers((prev) => prev.map((v, i) => (i === index ? nextSelection : v)));
  };

  const submit = () => {
    if (selected.length !== need) {
      setHint(need === 1 ? 'Pick an answer first.' : `Pick exactly ${numberWord(need)} options.`);
      return;
    }
    setHint(null);
    setSubmitted((prev) => prev.map((v, i) => (i === index ? true : v)));
    setShowExplanation(true);
    const attempt: Attempt = {
      questionId: current.question.id,
      selected: toOriginalIndexes(current, selected),
      correct: gradeAt(index),
      mode: config.mode,
      sessionId,
      answeredAt: new Date().toISOString(),
    };
    api.postAttempts([attempt]).catch((err) => setSaveError(errorText(err)));
  };

  const goTo = (i: number) => {
    setHint(null);
    setIndex(Math.max(0, Math.min(total - 1, i)));
  };

  const next = () => {
    if (index < total - 1) goTo(index + 1);
    else if (exam) setConfirmFinish(true);
    else void finish();
  };

  const primary = () => {
    if (exam) next();
    else if (isSubmitted) next();
    else submit();
  };

  const toggleFlag = () => setFlags((prev) => prev.map((v, i) => (i === index ? !v : v)));

  useKeyboardShortcuts((e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setPaused((p) => !p);
      return;
    }
    if (paused || finishing) return;
    const key = e.key.toLowerCase();
    if (key === 'enter') {
      e.preventDefault();
      primary();
    } else if (/^[1-8]$/.test(key)) toggleOption(Number(key) - 1);
    else if (['a', 'b', 'c', 'd'].includes(key)) toggleOption(key.charCodeAt(0) - 97);
    else if (key === 'f') toggleFlag();
    else if (key === 'e' && isSubmitted) setShowExplanation((s) => !s);
  }, !confirmFinish);

  const answeredCount = exam ? answers.filter((a, i) => a.length === needs[i]).length : submitted.filter(Boolean).length;
  const correctSoFar = submitted.reduce((n, s, i) => n + (s && gradeAt(i) ? 1 : 0), 0);
  const lastQuestion = index === total - 1;
  const unanswered = answers.filter((a) => a.length === 0).length;
  const incomplete = answers.filter((a, i) => a.length > 0 && a.length < needs[i]).length;
  const flaggedCount = flags.filter(Boolean).length;
  const firstFlagged = flags.findIndex(Boolean);

  const primaryLabel = exam
    ? lastQuestion
      ? 'Review & finish (Enter)'
      : 'Next (Enter)'
    : !isSubmitted
      ? 'Submit (Enter)'
      : lastQuestion
        ? 'Finish (Enter)'
        : 'Next (Enter)';

  return (
    <div className={exam ? 'max-w-5xl mx-auto' : 'max-w-3xl mx-auto'}>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h1 className="text-lg font-semibold">{config.title}</h1>
        <span className="text-muted">
          Question {index + 1} of {total}
        </span>
        {!exam && (
          <Badge tone="good">
            {correctSoFar}/{answeredCount} correct
          </Badge>
        )}
        {remaining !== undefined ? (
          <span
            className={`ml-auto font-mono text-lg ${remaining <= 300 ? 'text-bad font-semibold' : 'text-ink'}`}
            title="Time left"
          >
            ⏱ {formatClock(remaining)}
          </span>
        ) : (
          <span className="ml-auto font-mono text-muted" title="Time spent (pauses excluded)">
            {formatClock(elapsed)}
          </span>
        )}
        <Button size="sm" onClick={() => setPaused(true)}>
          Pause
        </Button>
        {exam ? (
          <Button size="sm" variant="danger" disabled={finishing} onClick={() => setConfirmFinish(true)}>
            Finish exam
          </Button>
        ) : (
          <Button
            size="sm"
            variant="danger"
            disabled={finishing}
            onClick={() => {
              if (window.confirm('End this session now? Answers you already submitted are saved.')) void finish();
            }}
          >
            End session
          </Button>
        )}
      </div>
      <div className="h-1.5 bg-raised rounded mb-5 overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${(answeredCount / total) * 100}%` }} />
      </div>

      <div className={exam ? 'grid lg:grid-cols-[1fr_300px] gap-5 items-start' : ''}>
        <Card className="p-6">
          <QuestionView
            presented={current}
            selected={selected}
            onToggle={toggleOption}
            revealed={isSubmitted}
            showDomain={!exam}
            flagged={flags[index]}
            showExplanations={showExplanation}
          />

          {isSubmitted && (
            <div className="mt-5">
              {gradeAt(index) ? (
                <Notice tone="good">
                  <span className="font-semibold">✓ Correct</span>
                </Notice>
              ) : (
                <Notice tone="bad">
                  <span className="font-semibold">✗ Incorrect</span>
                </Notice>
              )}
              {showExplanation && current.question.explanation && (
                <div className="mt-4 border-l-2 border-accent pl-4 whitespace-pre-line">{current.question.explanation}</div>
              )}
            </div>
          )}

          {hint && <p className="mt-4 text-warn">{hint}</p>}

          <div className="flex flex-wrap items-center gap-2 mt-6">
            {exam && (
              <Button disabled={index === 0} onClick={() => goTo(index - 1)}>
                ← Previous
              </Button>
            )}
            <Button onClick={toggleFlag}>{flags[index] ? 'Unflag (F)' : 'Flag for review (F)'}</Button>
            {isSubmitted && (current.question.explanation || current.optionExplanations) && (
              <Button onClick={() => setShowExplanation((s) => !s)}>{showExplanation ? 'Hide' : 'Show'} explanation (E)</Button>
            )}
            <Button variant="primary" className="ml-auto" disabled={finishing} onClick={primary}>
              {primaryLabel}
            </Button>
          </div>
        </Card>

        {exam && <Navigator total={total} current={index} answers={answers} flags={flags} needs={needs} onJump={goTo} />}
      </div>

      <p className="text-xs text-muted mt-3 text-center">
        1–{Math.min(8, current.options.length)} or A–D select · Enter {exam ? 'next' : 'submit/next'} · F flag
        {exam ? '' : ' · E explanation'} · Esc pause
      </p>
      {saveError && (
        <div className="mt-3">
          <Notice tone="bad">Could not save an answer: {saveError}</Notice>
        </div>
      )}

      {confirmFinish && (
        <Modal title="Finish the exam?" onClose={() => setConfirmFinish(false)}>
          <ul className="space-y-1 mb-5">
            <li>
              <span className="font-semibold">{total - unanswered - incomplete}</span> of {total} answered
            </li>
            {unanswered > 0 && <li className="text-bad">{unanswered} not answered — they will count as wrong</li>}
            {incomplete > 0 && <li className="text-warn">{incomplete} "Choose" questions with too few options picked</li>}
            {flaggedCount > 0 && <li className="text-warn">{flaggedCount} flagged for review</li>}
          </ul>
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setConfirmFinish(false)}>Keep working</Button>
            {firstFlagged >= 0 && (
              <Button
                onClick={() => {
                  setConfirmFinish(false);
                  goTo(firstFlagged);
                }}
              >
                Go to first flagged
              </Button>
            )}
            <Button variant="primary" onClick={() => void finish()}>
              Finish and see results
            </Button>
          </div>
        </Modal>
      )}

      {paused && (
        <div className="fixed inset-0 z-50 bg-bg/95 flex flex-col items-center justify-center gap-4">
          <p className="text-3xl font-semibold">Paused</p>
          <p className="text-muted">The clock is stopped. Press Esc or the button to continue.</p>
          <Button variant="primary" onClick={() => setPaused(false)}>
            Resume
          </Button>
        </div>
      )}
      {finishing && (
        <div className="fixed inset-0 z-50 bg-bg/80 flex items-center justify-center">
          <p className="text-lg">Saving results…</p>
        </div>
      )}
    </div>
  );
}

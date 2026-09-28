import { useMemo, useRef, useState } from 'react';
import { estimateScaledScore, pct, tallyByDomain } from '../../../shared/scoring';
import type { Attempt, Session } from '../../../shared/schema';
import { isAnswerCorrect, presentQuestion, toOriginalIndexes } from '../../../shared/shuffle';
import { api, errorText } from '../api';
import { QuestionView } from '../components/QuestionView';
import { Badge, Button, Card, Notice } from '../components/ui';
import { useData } from '../data';
import { numberWord } from '../format';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { formatClock, useStopwatch } from '../hooks/useStopwatch';
import { newSessionId, type SessionConfig, type SessionItemResult, type SessionResult } from '../session';

export function SessionPage({ config, onFinish }: { config: SessionConfig; onFinish: (result: SessionResult) => void }) {
  const { reload } = useData();
  const presented = useMemo(() => config.questions.map((q) => presentQuestion(q)), [config]);
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
  const [hint, setHint] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const elapsed = useStopwatch(paused || finishing);
  const finished = useRef(false);

  const current = presented[index];
  const selected = answers[index];
  const isSubmitted = submitted[index];
  const need = current.question.selectCount;

  const gradeAt = (i: number) =>
    isAnswerCorrect(toOriginalIndexes(presented[i], answers[i]), presented[i].question.correct);

  const toggleOption = (option: number) => {
    if (paused || isSubmitted || option >= current.options.length) return;
    let nextSelection: number[];
    if (need === 1) nextSelection = [option];
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

  const finish = async () => {
    if (finished.current) return;
    finished.current = true;
    setFinishing(true);
    const items: SessionItemResult[] = presented.map((p, i) => ({
      presented: p,
      selected: answers[i],
      answered: submitted[i],
      correct: submitted[i] && gradeAt(i),
      flagged: flags[i],
    }));
    const counted = items.filter((it) => it.answered);
    const correct = counted.filter((it) => it.correct).length;
    const tally = tallyByDomain(counted.map((it) => ({ domain: it.presented.question.domain, correct: it.correct })));
    const session: Session = {
      id: sessionId,
      mode: config.mode,
      startedAt,
      endedAt: new Date().toISOString(),
      durationSec: elapsed,
      total: counted.length,
      correct,
      scorePct: pct(correct, counted.length),
      byDomain: tally,
      estimatedScaled: config.mode === 'exam' ? estimateScaledScore(counted.length ? correct / counted.length : 0) : undefined,
    };
    let error: string | undefined;
    if (counted.length > 0) {
      try {
        await api.postSession(session);
      } catch (err) {
        error = errorText(err);
      }
    }
    await reload();
    onFinish({ config, session, items, saveError: error ?? saveError ?? undefined });
  };

  const next = () => {
    setHint(null);
    if (index < total - 1) setIndex(index + 1);
    else void finish();
  };

  const primary = () => (isSubmitted ? next() : submit());

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
  });

  const answeredCount = submitted.filter(Boolean).length;
  const correctSoFar = submitted.reduce((n, s, i) => n + (s && gradeAt(i) ? 1 : 0), 0);
  const lastQuestion = index === total - 1;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h1 className="text-lg font-semibold">{config.title}</h1>
        <span className="text-muted">
          Question {index + 1} of {total}
        </span>
        <Badge tone="good">
          {correctSoFar}/{answeredCount} correct
        </Badge>
        <span className="ml-auto font-mono text-muted" title="Time spent (pauses excluded)">
          {formatClock(elapsed)}
        </span>
        <Button size="sm" onClick={() => setPaused(true)}>
          Pause
        </Button>
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
      </div>
      <div className="h-1.5 bg-raised rounded mb-5 overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${(answeredCount / total) * 100}%` }} />
      </div>

      <Card className="p-6">
        <QuestionView
          presented={current}
          selected={selected}
          onToggle={toggleOption}
          revealed={isSubmitted}
          showDomain
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
          <Button onClick={toggleFlag}>{flags[index] ? 'Unflag (F)' : 'Flag (F)'}</Button>
          {isSubmitted && (current.question.explanation || current.optionExplanations) && (
            <Button onClick={() => setShowExplanation((s) => !s)}>{showExplanation ? 'Hide' : 'Show'} explanation (E)</Button>
          )}
          <Button variant="primary" className="ml-auto" disabled={finishing} onClick={primary}>
            {!isSubmitted ? 'Submit (Enter)' : lastQuestion ? 'Finish (Enter)' : 'Next (Enter)'}
          </Button>
        </div>
      </Card>

      <p className="text-xs text-muted mt-3 text-center">
        1–{Math.min(8, current.options.length)} or A–D select · Enter submit/next · F flag · E explanation · Esc pause
      </p>
      {saveError && (
        <div className="mt-3">
          <Notice tone="bad">Could not save an answer: {saveError}</Notice>
        </div>
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
    </div>
  );
}

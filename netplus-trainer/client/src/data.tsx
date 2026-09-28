import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { localDay } from '../../shared/dates';
import type { Attempt, LeitnerCard, Question, Session } from '../../shared/schema';
import { type QuestionStat, questionStats } from '../../shared/stats';
import { api, errorText } from './api';

interface DataState {
  questions: Question[];
  attempts: Attempt[];
  leitner: Record<string, LeitnerCard>;
  sessions: Session[];
  today: string;
  stats: Map<string, QuestionStat>;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const DataContext = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [leitner, setLeitner] = useState<Record<string, LeitnerCard>>({});
  const [sessions, setSessions] = useState<Session[]>([]);
  const [today, setToday] = useState(localDay());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [q, p, s] = await Promise.all([api.questions(), api.progress(), api.sessions()]);
      setQuestions(q.questions);
      setAttempts(p.attempts);
      setLeitner(p.leitner);
      setToday(p.today);
      setSessions(s.sessions);
      setError(null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const stats = useMemo(() => questionStats(attempts), [attempts]);

  return (
    <DataContext.Provider value={{ questions, attempts, leitner, sessions, today, stats, loading, error, reload }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}

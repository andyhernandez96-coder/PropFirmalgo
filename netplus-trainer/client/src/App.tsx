import { useEffect, useState } from 'react';
import { Notice } from './components/ui';
import { useData } from './data';
import { BankPage } from './pages/Bank';
import { DashboardPage } from './pages/Dashboard';
import { SettingsPage } from './pages/Settings';
import { ExamResultsPage } from './pages/ExamResults';
import { ImportPage } from './pages/Import';
import { SessionPage } from './pages/Session';
import { StudyPage } from './pages/Study';
import { SummaryPage } from './pages/Summary';
import type { SessionConfig, SessionResult } from './session';

type Page = 'dashboard' | 'study' | 'bank' | 'import' | 'settings' | 'session' | 'summary' | 'results';
type NavPage = Exclude<Page, 'session' | 'summary' | 'results'>;

const NAV: { id: NavPage; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'study', label: 'Study' },
  { id: 'bank', label: 'Question Bank' },
  { id: 'import', label: 'Import' },
  { id: 'settings', label: 'Settings' },
];

export function App() {
  const { error, loading } = useData();
  const [page, setPage] = useState<Page>('dashboard');
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  const inSession = page === 'session';

  useEffect(() => {
    if (!inSession) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [inSession]);

  const go = (target: NavPage) => {
    const warning =
      config?.mode === 'exam'
        ? 'Leave the exam? Your answers in this exam will be lost.'
        : 'Leave this session? Answers you already submitted are saved.';
    if (inSession && !window.confirm(warning)) return;
    setPage(target);
  };

  const start = (c: SessionConfig) => {
    if (c.questions.length === 0) return;
    setConfig(c);
    setResult(null);
    setPage('session');
  };

  const finish = (r: SessionResult) => {
    setResult(r);
    setPage(r.config.mode === 'exam' ? 'results' : 'summary');
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-panel">
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-6 h-14">
          <span className="font-semibold">🌐 Network+ Trainer</span>
          <nav className="flex gap-1">
            {NAV.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => go(n.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  page === n.id ? 'bg-raised text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {n.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4">
            <Notice tone="bad">{error}</Notice>
          </div>
        )}
        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : page === 'session' && config ? (
          <SessionPage key={config.questions.map((q) => q.id).join()} config={config} onFinish={finish} />
        ) : page === 'results' && result ? (
          <ExamResultsPage result={result} onBack={() => setPage('study')} />
        ) : page === 'summary' && result ? (
          <SummaryPage result={result} onBack={() => setPage('study')} />
        ) : page === 'bank' ? (
          <BankPage />
        ) : page === 'import' ? (
          <ImportPage />
        ) : page === 'settings' ? (
          <SettingsPage />
        ) : page === 'dashboard' ? (
          <DashboardPage onStart={start} />
        ) : (
          <StudyPage onStart={start} />
        )}
      </main>
    </div>
  );
}

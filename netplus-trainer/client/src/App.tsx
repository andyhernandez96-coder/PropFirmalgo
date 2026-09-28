import { useState } from 'react';
import { useData } from './data';
import { Notice } from './components/ui';
import { BankPage } from './pages/Bank';
import { ImportPage } from './pages/Import';

type Page = 'bank' | 'import';

const NAV: { id: Page; label: string }[] = [
  { id: 'bank', label: 'Question Bank' },
  { id: 'import', label: 'Import' },
];

export function App() {
  const { error, loading } = useData();
  const [page, setPage] = useState<Page>('bank');

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
                onClick={() => setPage(n.id)}
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
        {loading ? <p className="text-muted">Loading…</p> : page === 'bank' ? <BankPage /> : <ImportPage />}
      </main>
    </div>
  );
}

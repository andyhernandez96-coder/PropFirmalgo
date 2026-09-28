import { useEffect, useState } from 'react';
import { localDay } from '../../../shared/dates';
import type { DomainId } from '../../../shared/domains';
import { generatorPrompt } from '../../../shared/prompts';
import { BackupSchema, formatIssues } from '../../../shared/schema';
import { api, BACKUP_DOWNLOAD_URL, errorText } from '../api';
import { CopyButton } from '../components/CopyButton';
import { Button, Card, DomainSelect, inputClass, Notice, PageTitle } from '../components/ui';
import { useData } from '../data';

function readTheme(): 'dark' | 'light' {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function setTheme(theme: 'dark' | 'light') {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem('theme', theme);
  } catch {
    // private mode: the choice just won't be remembered
  }
}

const SHORTCUTS: [string, string][] = [
  ['1–8 or A–D', 'Select an option'],
  ['Enter', 'Submit / next question'],
  ['F', 'Flag the question for review'],
  ['E', 'Show or hide the explanation (after answering)'],
  ['Esc', 'Pause / resume'],
];

export function SettingsPage() {
  const { reload } = useData();
  const [count, setCount] = useState(10);
  const [domain, setDomain] = useState('');
  const [objective, setObjective] = useState('');
  const [theme, setThemeState] = useState(readTheme);
  const [paths, setPaths] = useState<{ dataDir: string; inboxDir: string } | null>(null);
  const [restoreMsg, setRestoreMsg] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);

  useEffect(() => {
    api.info().then(setPaths).catch(() => setPaths(null));
  }, []);

  const prompt = generatorPrompt({
    count,
    domain: (domain || undefined) as DomainId | undefined,
    objective: objective.trim() || undefined,
    today: localDay(),
  });

  const restore = async (file: File | undefined) => {
    if (!file) return;
    setRestoreMsg(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setRestoreMsg({ tone: 'bad', text: 'That file is not valid JSON.' });
      return;
    }
    const backup = BackupSchema.safeParse(parsed);
    if (!backup.success) {
      setRestoreMsg({ tone: 'bad', text: `That is not a Network+ Trainer backup. ${formatIssues(backup.error).slice(0, 3).join(' · ')}` });
      return;
    }
    const b = backup.data;
    const ok = window.confirm(
      `Replace ALL your current data with this backup?\n\n` +
        `Backup from ${new Date(b.exportedAt).toLocaleString()}:\n` +
        `${b.questions.length} questions · ${b.progress.attempts.length} answers · ${b.sessions.length} sessions\n\n` +
        `A copy of your current data is saved first, just in case.`,
    );
    if (!ok) return;
    try {
      const r = await api.restoreBackup(b);
      await reload();
      setRestoreMsg({
        tone: 'good',
        text: `Restored ${r.questions} questions, ${r.attempts} answers and ${r.sessions} sessions. Your previous data was saved to ${r.safetyCopy}`,
      });
    } catch (err) {
      setRestoreMsg({ tone: 'bad', text: errorText(err) });
    }
  };

  return (
    <div className="space-y-5">
      <PageTitle>Settings</PageTitle>

      <Card className="p-5">
        <h2 className="font-semibold">Get new questions from Claude</h2>
        <p className="text-sm text-muted mb-4">
          Copy this prompt, paste it in a chat with Claude, then paste Claude's answer in Import → Paste JSON.
        </p>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <label className="flex items-center gap-2">
            <span className="text-sm text-muted">Questions</span>
            <input
              type="number"
              min={1}
              max={50}
              className={`${inputClass} w-20`}
              value={count}
              onChange={(e) => setCount(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
            />
          </label>
          <DomainSelect value={domain} onChange={setDomain} allowAll />
          <input
            className={`${inputClass} w-44`}
            placeholder="Objective (optional)"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
          />
          <CopyButton variant="primary" label="Copy generator prompt" text={() => prompt} />
        </div>
        <textarea readOnly className={`${inputClass} w-full h-56 font-mono text-xs`} value={prompt} />
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">Backup</h2>
        <p className="text-sm text-muted mb-4">One .json file with all your questions, answers and sessions.</p>
        <div className="flex flex-wrap items-center gap-3">
          <a href={BACKUP_DOWNLOAD_URL} download className="bg-accent text-accent-ink rounded-md font-medium px-4 py-2 hover:brightness-110">
            Export backup
          </a>
          <label className="bg-raised border border-line rounded-md font-medium px-4 py-2 cursor-pointer hover:bg-line/60">
            Import backup…
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(e) => {
                void restore(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        {restoreMsg && (
          <div className="mt-3">
            <Notice tone={restoreMsg.tone}>{restoreMsg.text}</Notice>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Appearance</h2>
        <div className="flex gap-2">
          {(['dark', 'light'] as const).map((t) => (
            <Button
              key={t}
              variant={theme === t ? 'primary' : 'secondary'}
              onClick={() => {
                setTheme(t);
                setThemeState(t);
              }}
            >
              {t === 'dark' ? 'Dark' : 'Light'}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Keyboard shortcuts</h2>
        <table className="text-sm">
          <tbody>
            {SHORTCUTS.map(([k, v]) => (
              <tr key={k}>
                <td className="pr-6 py-1 font-mono">{k}</td>
                <td className="py-1 text-muted">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-2">Where your data lives</h2>
        {paths ? (
          <div className="text-sm space-y-1">
            <p>
              Data folder: <span className="font-mono select-all break-all">{paths.dataDir}</span>
            </p>
            <p>
              Inbox folder: <span className="font-mono select-all break-all">{paths.inboxDir}</span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">Server not reachable.</p>
        )}
      </Card>
    </div>
  );
}

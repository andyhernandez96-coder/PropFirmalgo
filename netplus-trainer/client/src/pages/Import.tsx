import { useCallback, useEffect, useState } from 'react';
import { extractQuestionArray } from '../../../shared/importer';
import { parseQuestionText } from '../../../shared/textParser';
import { localDay } from '../../../shared/dates';
import { api, errorText, type InboxLogEntry } from '../api';
import { ImportPreview, type PreviewItem } from '../components/ImportPreview';
import { Button, Card, inputClass, Notice, PageTitle, Tabs } from '../components/ui';

type Tab = 'json' | 'text' | 'file' | 'inbox';

const TEXT_EXAMPLE = `1. Which protocol uses port 3389?
A) SSH  B) RDP  C) Telnet  D) SMB
Answer: B
Explanation: RDP (Remote Desktop Protocol) usa TCP 3389.`;

function jsonToItems(text: string): { items: PreviewItem[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return { error: `This is not valid JSON: ${(err as Error).message}` };
  }
  const arr = extractQuestionArray(parsed);
  if (!arr) return { error: 'The JSON must be a list of questions: [ {...}, {...} ]' };
  return {
    items: arr.map((raw) => ({
      raw: raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : { question: String(raw) },
      parserErrors: raw && typeof raw === 'object' && !Array.isArray(raw) ? [] : ['this item is not a question object'],
    })),
  };
}

function textToItems(text: string): PreviewItem[] {
  const source = `chat-text-${localDay()}`;
  return parseQuestionText(text).map((d) => ({
    raw: Object.fromEntries(
      Object.entries({
        domain: d.domain,
        objective: d.objective,
        question: d.question,
        options: d.options,
        correct: d.correct,
        selectCount: d.selectCount,
        explanation: d.explanation,
        source,
      }).filter(([, v]) => v !== undefined),
    ),
    parserErrors: d.errors,
  }));
}

function InboxPanel() {
  const [dir, setDir] = useState('');
  const [entries, setEntries] = useState<InboxLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.inboxLog();
      setDir(r.inboxDir);
      setEntries(r.entries);
      setError(null);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="space-y-4">
      <Notice tone="info">
        <p>Drop any <code>.json</code> file with questions into this folder:</p>
        <p className="font-mono text-sm mt-2 break-all select-all">{dir || '…'}</p>
        <p className="text-sm text-muted mt-2">
          The app checks it every 10 seconds. Imported files move to <code>processed</code>; files that cannot be read move to{' '}
          <code>failed</code>. If some questions have errors, a <code>.errors.txt</code> file appears next to the moved file.
        </p>
      </Notice>
      {error && <Notice tone="bad">{error}</Notice>}
      <Card>
        <div className="px-4 py-3 border-b border-line flex items-center">
          <h3 className="font-semibold">Recent inbox imports</h3>
          <Button size="sm" className="ml-auto" onClick={load}>
            Refresh
          </Button>
        </div>
        {entries.length === 0 ? (
          <p className="p-4 text-muted">Nothing imported from the inbox since the app started.</p>
        ) : (
          <ul className="divide-y divide-line">
            {entries.map((e, i) => (
              <li key={i} className="px-4 py-3 text-sm">
                <div className="flex gap-3">
                  <span className="font-medium">{e.file}</span>
                  <span className="text-muted">{new Date(e.at).toLocaleString()}</span>
                </div>
                {e.status === 'failed' ? (
                  <p className="text-bad">Could not import: {e.errors[0]}</p>
                ) : (
                  <p>
                    {e.imported} imported · {e.duplicates} duplicates · {e.invalid} with errors
                  </p>
                )}
                {e.status === 'imported' && e.errors.length > 0 && (
                  <ul className="text-bad list-disc ml-5 mt-1">
                    {e.errors.slice(0, 5).map((msg, k) => (
                      <li key={k}>{msg}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function ImportPage() {
  const [tab, setTab] = useState<Tab>('json');
  const [jsonText, setJsonText] = useState('');
  const [rawText, setRawText] = useState('');
  const [items, setItems] = useState<PreviewItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');

  const reset = () => {
    setItems(null);
    setError(null);
  };

  const previewJson = (text: string) => {
    const r = jsonToItems(text);
    if ('error' in r) {
      setError(r.error);
      setItems(null);
    } else {
      setError(null);
      setItems(r.items);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    previewJson(await file.text());
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    reset();
  };

  const done = () => {
    reset();
    setJsonText('');
    setRawText('');
    setFileName('');
  };

  return (
    <div>
      <PageTitle sub="Bring questions from Claude or from a file. Nothing is saved until you press Import.">Import questions</PageTitle>
      <Tabs
        tabs={[
          { id: 'json', label: 'Paste JSON' },
          { id: 'text', label: 'Paste text' },
          { id: 'file', label: 'Upload file' },
          { id: 'inbox', label: 'Inbox folder' },
        ]}
        active={tab}
        onChange={switchTab}
      />

      {tab === 'inbox' && <InboxPanel />}

      {tab !== 'inbox' && !items && (
        <div className="space-y-3">
          {tab === 'json' && (
            <>
              <textarea
                className={`${inputClass} w-full h-72 font-mono text-sm`}
                placeholder='[ { "domain": "1.0", "question": "...", "options": ["...", "..."], "correct": [1], "explanation": "..." } ]'
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
              />
              <Button variant="primary" disabled={!jsonText.trim()} onClick={() => previewJson(jsonText)}>
                Preview
              </Button>
            </>
          )}
          {tab === 'text' && (
            <>
              <textarea
                className={`${inputClass} w-full h-72 font-mono text-sm`}
                placeholder={TEXT_EXAMPLE}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
              <p className="text-sm text-muted">
                Understands "A) / A. / (A)" options, "Answer: B" or "Answer: B, D", "Choose TWO", "Explanation:", and the tutor
                format in Spanish with a separate "Answer Key" ("Respuesta correcta: b)"). Questions without a detected domain can
                be assigned one in the preview.
              </p>
              <Button
                variant="primary"
                disabled={!rawText.trim()}
                onClick={() => {
                  setError(null);
                  setItems(textToItems(rawText));
                }}
              >
                Preview
              </Button>
            </>
          )}
          {tab === 'file' && (
            <Card className="p-6">
              <label className="block">
                <span className="block mb-2">Choose a .json file with questions:</span>
                <input type="file" accept=".json,application/json" onChange={(e) => void onFile(e.target.files?.[0])} />
              </label>
              {fileName && <p className="text-sm text-muted mt-2">{fileName}</p>}
            </Card>
          )}
          {error && <Notice tone="bad">{error}</Notice>}
        </div>
      )}

      {tab !== 'inbox' && items && (
        <div>
          <Button variant="ghost" size="sm" className="mb-2" onClick={reset}>
            ← Back to editing
          </Button>
          <ImportPreview items={items} onDone={done} />
        </div>
      )}
    </div>
  );
}

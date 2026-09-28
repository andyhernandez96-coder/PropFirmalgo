import { useMemo, useState } from 'react';
import type { DomainId } from '../../../shared/domains';
import { bankHashes, classifyBatch, type DraftStatus } from '../../../shared/importer';
import { api, errorText, type ImportResult } from '../api';
import { useData } from '../data';
import { OptionReview } from './OptionReview';
import { Badge, Button, Card, DomainSelect, Notice } from './ui';

export interface PreviewItem {
  raw: Record<string, unknown>;
  /** Problems found while reading raw text; they block the import of that item. */
  parserErrors: string[];
}

function friendly(error: string): string {
  if (error.startsWith('domain:')) return 'domain: missing or not valid. Pick one in the selector above.';
  return error;
}

export function ImportPreview({ items, onDone }: { items: PreviewItem[]; onDone: () => void }) {
  const { questions, reload } = useData();
  const [domains, setDomains] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const withDomains = useMemo(
    () =>
      items.map((item, i) => {
        const chosen = domains[i];
        return chosen ? { ...item.raw, domain: chosen } : item.raw;
      }),
    [items, domains],
  );

  const statuses: DraftStatus[] = useMemo(() => {
    const classified = classifyBatch(withDomains, bankHashes(questions));
    return classified.map((status, i) =>
      items[i].parserErrors.length > 0 ? { status: 'invalid', errors: items[i].parserErrors } : status,
    );
  }, [withDomains, questions, items]);

  const valid = statuses.flatMap((s) => (s.status === 'valid' ? [s.question] : []));
  const counts = {
    valid: valid.length,
    duplicate: statuses.filter((s) => s.status === 'duplicate').length,
    invalid: statuses.filter((s) => s.status === 'invalid').length,
  };

  const setAll = (domain: string) => {
    if (!domain) return;
    setDomains(Object.fromEntries(items.map((_, i) => [i, domain])));
  };

  const doImport = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.importQuestions(valid);
      setResult(r);
      await reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <Notice tone={result.invalid.length ? 'warn' : 'good'}>
        <p className="font-medium">
          Imported {result.imported} question{result.imported === 1 ? '' : 's'}
          {result.duplicates > 0 && ` · ${result.duplicates} already in your bank`}
          {result.invalid.length > 0 && ` · ${result.invalid.length} rejected by the server`}
        </p>
        <Button className="mt-3" onClick={onDone}>
          Import more
        </Button>
      </Notice>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 sticky top-0 z-10 bg-bg py-3 border-b border-line">
        <Badge tone="good">{counts.valid} valid</Badge>
        <Badge tone="warn">{counts.duplicate} duplicates</Badge>
        <Badge tone="bad">{counts.invalid} with errors</Badge>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-muted">Set domain for all:</span>
          <DomainSelect value="" onChange={setAll} placeholder="Choose…" />
        </div>
        <Button variant="primary" disabled={busy || counts.valid === 0} onClick={doImport}>
          {busy ? 'Importing…' : `Import ${counts.valid} valid`}
        </Button>
      </div>
      {error && <Notice tone="bad">{error}</Notice>}
      {items.length === 0 && <Notice tone="warn">No questions were found in what you pasted.</Notice>}
      {items.map((_item, i) => {
        const status = statuses[i];
        const raw = withDomains[i];
        const options = Array.isArray(raw.options) ? (raw.options as unknown[]).map(String) : [];
        const correct = Array.isArray(raw.correct) ? (raw.correct as unknown[]).filter((n): n is number => typeof n === 'number') : [];
        const currentDomain = typeof raw.domain === 'string' ? raw.domain : '';
        return (
          <Card key={i} className="p-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-semibold text-muted">#{i + 1}</span>
              {status.status === 'valid' && <Badge tone="good">Valid</Badge>}
              {status.status === 'duplicate' && <Badge tone="warn">Already in bank</Badge>}
              {status.status === 'invalid' && <Badge tone="bad">Has errors</Badge>}
              <div className="ml-auto">
                <DomainSelect
                  value={currentDomain}
                  onChange={(d) => setDomains((prev) => ({ ...prev, [i]: d as DomainId }))}
                  placeholder="Choose a domain…"
                  className="text-sm py-1"
                />
              </div>
            </div>
            <p className="whitespace-pre-line mb-3">{String(raw.question ?? '(no question text)')}</p>
            {options.length > 0 && <OptionReview options={options} correct={correct} />}
            {status.status === 'invalid' && (
              <ul className="mt-3 text-sm text-bad list-disc ml-5">
                {status.errors.map((e, k) => (
                  <li key={k}>{friendly(e)}</li>
                ))}
              </ul>
            )}
            {typeof raw.explanation === 'string' && raw.explanation.trim() && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-muted">Explanation</summary>
                <p className="whitespace-pre-line mt-2">{raw.explanation}</p>
              </details>
            )}
          </Card>
        );
      })}
    </div>
  );
}

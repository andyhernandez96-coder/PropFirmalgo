import { DOMAINS } from '../../../shared/domains';

export interface DomainRow {
  total: number;
  correct: number;
}

/**
 * Accuracy per domain as horizontal bars in one hue. Each row shows its value as text,
 * so nothing depends on color; the hairline marks the exam passing line.
 */
export function DomainBars({ rows, passLine }: { rows: Record<string, DomainRow | undefined>; passLine?: number }) {
  return (
    <div className="space-y-3.5">
      {DOMAINS.map((d) => {
        const r = rows[d.id];
        const has = r !== undefined && r.total > 0;
        const value = has ? Math.round((r.correct / r.total) * 100) : 0;
        const below = has && passLine !== undefined && value < passLine;
        const summary = has
          ? `${d.id} ${d.name}: ${value}% correct (${r.correct} of ${r.total})${below ? ', below the passing line' : ''}`
          : `${d.id} ${d.name}: no answers yet`;
        return (
          <div key={d.id} className="group" title={summary} tabIndex={0} aria-label={summary}>
            <div className="flex items-baseline text-sm mb-1.5 gap-2">
              <span className="font-medium">
                {d.id} {d.name}
              </span>
              <span className="text-muted text-xs">weight {Math.round(d.weight * 100)}%</span>
              <span className="ml-auto tabular-nums">
                {has ? (
                  <>
                    <span className="font-semibold">{value}%</span>
                    <span className="text-muted">
                      {' '}
                      ({r.correct}/{r.total})
                    </span>
                    {below && <span className="text-muted text-xs"> · below line</span>}
                  </>
                ) : (
                  <span className="text-muted">no data</span>
                )}
              </span>
            </div>
            <div className="relative h-2.5 bg-raised rounded-sm">
              <div
                className="h-full bg-accent rounded-r group-hover:brightness-125 group-focus:brightness-125"
                style={{ width: `${value}%` }}
              />
              {passLine !== undefined && (
                <div className="absolute -top-1 -bottom-1 w-px bg-muted" style={{ left: `${passLine}%` }} aria-hidden="true" />
              )}
            </div>
          </div>
        );
      })}
      {passLine !== undefined && (
        <p className="text-xs text-muted flex items-center gap-2">
          <span className="inline-block w-px h-3 bg-muted" aria-hidden="true" /> passing line ≈ {passLine}% correct (estimate)
        </p>
      )}
    </div>
  );
}

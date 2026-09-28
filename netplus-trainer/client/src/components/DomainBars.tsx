import { DOMAINS } from '../../../shared/domains';

export interface DomainRow {
  total: number;
  correct: number;
}

/** Accuracy per domain as horizontal bars, with each domain's exam weight next to it. */
export function DomainBars({ rows, passLine }: { rows: Record<string, DomainRow | undefined>; passLine?: number }) {
  return (
    <div className="space-y-3">
      {DOMAINS.map((d) => {
        const r = rows[d.id];
        const has = r !== undefined && r.total > 0;
        const value = has ? Math.round((r.correct / r.total) * 100) : 0;
        const tone = !has ? 'bg-raised' : passLine !== undefined && value < passLine ? 'bg-warn' : 'bg-good';
        return (
          <div key={d.id}>
            <div className="flex text-sm mb-1 gap-2">
              <span className="font-medium">
                {d.id} {d.name}
              </span>
              <span className="text-muted">weight {Math.round(d.weight * 100)}%</span>
              <span className="ml-auto tabular-nums">
                {has ? (
                  <>
                    <span className="font-semibold">{value}%</span>
                    <span className="text-muted">
                      {' '}
                      ({r.correct}/{r.total})
                    </span>
                  </>
                ) : (
                  <span className="text-muted">no data</span>
                )}
              </span>
            </div>
            <div className="relative h-2.5 bg-raised rounded overflow-hidden">
              <div className={`h-full ${tone}`} style={{ width: `${value}%` }} />
              {passLine !== undefined && (
                <div className="absolute top-0 bottom-0 w-px bg-ink/60" style={{ left: `${passLine}%` }} title={`${passLine}%`} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

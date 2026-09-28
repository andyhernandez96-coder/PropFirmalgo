import { useState } from 'react';
import { PASSING_SCALED } from '../../../shared/scoring';

export interface TrendPoint {
  label: string;
  value: number;
  detail: string;
}

const W = 640;
const H = 220;
const PAD = { top: 16, right: 56, bottom: 28, left: 44 };
const MIN = 100;
const MAX = 900;
const TICKS = [100, 300, 500, 700, 900];

/** Estimated exam score over the last exams, with the 720 passing line. One series, no legend. */
export function TrendChart({ points }: { points: TrendPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - ((v - MIN) / (MAX - MIN)) * innerH;
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const columnW = points.length > 1 ? innerW / (points.length - 1) : innerW;
  const last = points.length - 1;
  const shown = active ?? null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Estimated score in recent exam simulations">
        {TICKS.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="fill-muted text-[11px] tabular-nums">
              {t}
            </text>
          </g>
        ))}
        <line x1={PAD.left} x2={W - PAD.right} y1={y(PASSING_SCALED)} y2={y(PASSING_SCALED)} className="stroke-muted" strokeWidth={1} />
        <text x={W - PAD.right + 6} y={y(PASSING_SCALED) + 4} className="fill-muted text-[11px]">
          720 pass
        </text>
        {shown !== null && (
          <line x1={x(shown)} x2={x(shown)} y1={PAD.top} y2={PAD.top + innerH} className="stroke-muted" strokeWidth={1} />
        )}
        <path d={path} fill="none" className="stroke-accent" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.value)}
            r={i === shown ? 5.5 : 4}
            className="fill-accent stroke-panel"
            strokeWidth={2}
          />
        ))}
        {points.length > 0 && (
          <text x={x(last) + 8} y={y(points[last].value) - 8} className="fill-ink text-[12px] font-semibold tabular-nums">
            {points[last].value}
          </text>
        )}
        {points.map((p, i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="fill-muted text-[11px]">
            {p.label}
          </text>
        ))}
        {points.map((p, i) => (
          <rect
            key={i}
            x={x(i) - columnW / 2}
            y={PAD.top}
            width={Math.max(24, columnW)}
            height={innerH}
            fill="transparent"
            tabIndex={0}
            aria-label={`${p.label}: estimated ${p.value}. ${p.detail}`}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className="outline-none"
          />
        ))}
      </svg>
      {shown !== null && (
        <div
          className="absolute pointer-events-none bg-panel border border-line rounded-md px-3 py-2 text-sm shadow-lg"
          style={{
            left: `${(x(shown) / W) * 100}%`,
            top: `${(y(points[shown].value) / H) * 100}%`,
            transform: `translate(${shown > points.length / 2 ? 'calc(-100% - 12px)' : '12px'}, -50%)`,
          }}
        >
          <p className="font-semibold tabular-nums">{points[shown].value} estimated</p>
          <p className="text-muted">{points[shown].detail}</p>
        </div>
      )}
    </div>
  );
}

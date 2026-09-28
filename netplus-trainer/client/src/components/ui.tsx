import { type ButtonHTMLAttributes, type ReactNode, useEffect } from 'react';
import { type DomainId, DOMAINS, domainName } from '../../../shared/domains';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-110 border border-accent',
  secondary: 'bg-raised text-ink hover:bg-line/60 border border-line',
  danger: 'bg-transparent text-bad border border-bad/60 hover:bg-bad/10',
  ghost: 'bg-transparent text-muted hover:text-ink hover:bg-raised border border-transparent',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  const sizing = size === 'sm' ? 'px-2.5 py-1 text-sm' : 'px-4 py-2';
  return (
    <button
      type="button"
      className={`${VARIANTS[variant]} ${sizing} rounded-md font-medium disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-panel border border-line rounded-lg ${className}`}>{children}</div>;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'bad' | 'warn' | 'accent' }) {
  const tones = {
    neutral: 'bg-raised text-muted border-line',
    good: 'bg-good/10 text-good border-good/40',
    bad: 'bg-bad/10 text-bad border-bad/40',
    warn: 'bg-warn/10 text-warn border-warn/40',
    accent: 'bg-accent/10 text-accent border-accent/40',
  };
  return <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded border ${tones[tone]}`}>{children}</span>;
}

export function DomainBadge({ domain }: { domain: DomainId }) {
  return (
    <span title={domainName(domain)}>
      <Badge tone="accent">
        {domain} {domainName(domain)}
      </Badge>
    </span>
  );
}

export const inputClass =
  'bg-bg border border-line rounded-md px-3 py-2 text-ink placeholder:text-muted/70 focus:border-accent outline-none';

export function DomainSelect({
  value,
  onChange,
  allowAll,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  allowAll?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <select className={`${inputClass} ${className}`} value={value} onChange={(e) => onChange(e.target.value)}>
      {allowAll && <option value="">All domains</option>}
      {placeholder && <option value="">{placeholder}</option>}
      {DOMAINS.map((d) => (
        <option key={d.id} value={d.id}>
          {d.id} {d.name} ({Math.round(d.weight * 100)}%)
        </option>
      ))}
    </select>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-start justify-center overflow-y-auto p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="bg-panel border border-line rounded-lg w-full max-w-3xl my-8"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-line">
          <h2 className="font-semibold text-lg">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-line mb-4" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2 -mb-px border-b-2 font-medium ${
            active === t.id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Notice({ tone, children }: { tone: 'good' | 'bad' | 'warn' | 'info'; children: ReactNode }) {
  const tones = {
    good: 'border-good/50 bg-good/10',
    bad: 'border-bad/50 bg-bad/10',
    warn: 'border-warn/50 bg-warn/10',
    info: 'border-accent/50 bg-accent/10',
  };
  return <div className={`border rounded-md px-4 py-3 ${tones[tone]}`}>{children}</div>;
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-semibold">{children}</h1>
      {sub && <p className="text-muted mt-1">{sub}</p>}
    </div>
  );
}

export const LETTERS = 'ABCDEFGH';

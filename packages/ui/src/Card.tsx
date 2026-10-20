import type { ReactNode } from 'react';
import { cn } from './cn';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-cg border border-line bg-panel shadow-cg', className)}>{children}</div>;
}
export function CardHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
}

export function StatTile({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="rounded-cg border border-line bg-panel px-4 py-3 shadow-cg">
      <div className="text-xs font-medium uppercase tracking-wide text-muted" style={{ letterSpacing: '0.04em' }}>{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold tabular-nums" style={tone ? { color: tone } : undefined}>{value}</div>
    </div>
  );
}

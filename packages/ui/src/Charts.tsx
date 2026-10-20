import { cn } from './cn';

export interface FunnelStep { label: string; value: number; color: string; }

/** Horizontal stepped funnel — the characteristic view of a phishing campaign. */
export function Funnel({ steps, className }: { steps: FunnelStep[]; className?: string }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className={cn('space-y-2.5', className)}>
      {steps.map((s) => {
        const pct = Math.round((s.value / max) * 100);
        return (
          <div key={s.label} className="flex items-center gap-3">
            <div className="w-24 shrink-0 text-right text-sm text-ink-soft">{s.label}</div>
            <div className="relative h-7 flex-1 overflow-hidden rounded-cg-sm bg-surface">
              <div className="h-full rounded-cg-sm transition-[width] duration-500" style={{ width: `${pct}%`, backgroundColor: s.color }} />
              <span className="absolute inset-y-0 left-2 flex items-center font-mono text-xs font-medium text-ink">{s.value}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Minimal sparkline/area for the success-rate trend. */
export function Trend({ points, className, color = 'var(--cg-primary)' }: { points: { label: string; value: number }[]; className?: string; color?: string }) {
  const w = 480, h = 120, pad = 8;
  if (points.length === 0) return <div className={cn('text-sm text-muted', className)}>No data yet</div>;
  const max = Math.max(1, ...points.map((p) => p.value));
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => [pad + i * step, h - pad - (p.value / max) * (h - pad * 2)] as const);
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${coords[coords.length - 1]![0].toFixed(1)},${h - pad} L${pad},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn('h-32 w-full', className)} preserveAspectRatio="none" role="img" aria-label="Success rate trend">
      <path d={area} fill={color} opacity={0.12} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}

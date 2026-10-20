import { useEffect, useState } from 'react';
import { cn } from './cn';

export interface FunnelStep { label: string; value: number; color: string; }

/** Horizontal stepped funnel — the characteristic view of a phishing campaign. */
export function Funnel({ steps, className }: { steps: FunnelStep[]; className?: string }) {
  const base = Math.max(1, steps[0]?.value ?? 0, ...steps.map((s) => s.value));
  const sent = steps[0]?.value ?? 0;
  const [grown, setGrown] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setGrown(true)); return () => cancelAnimationFrame(id); }, []);
  return (
    <div className={cn('space-y-2', className)}>
      {steps.map((s, i) => {
        const pct = Math.round((s.value / base) * 100);
        const share = sent > 0 && i > 0 ? Math.round((s.value / sent) * 100) : null;
        const target = Math.max(pct, s.value > 0 ? 4 : 0);
        return (
          <div key={s.label} className="flex items-center gap-3">
            <div className="w-24 shrink-0 text-right text-sm text-ink-soft">{s.label}</div>
            <div className="relative h-9 flex-1 overflow-hidden rounded-cg-sm bg-panel-2">
              <div className="h-full rounded-cg-sm transition-[width] duration-700 ease-out motion-reduce:transition-none"
                style={{ width: `${grown ? target : 0}%`, backgroundColor: s.color, transitionDelay: `${i * 80}ms` }} />
              <span className="absolute inset-y-0 left-3 flex items-center font-mono text-sm font-semibold text-ink">{s.value}</span>
            </div>
            <div className="w-12 shrink-0 text-right font-mono text-xs text-muted">{share !== null ? `${share}%` : ''}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Minimal sparkline/area for the success-rate trend. */
export function Trend({ points, className, color = 'var(--cg-primary)' }: { points: { label: string; value: number }[]; className?: string; color?: string }) {
  const w = 480, h = 120, pad = 8;
  if (points.length === 0) return <div className={cn('flex h-32 items-center justify-center text-sm text-muted', className)}>No data yet</div>;
  const max = Math.max(1, ...points.map((p) => p.value));
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  if (points.length === 1) {
    const cy = y(points[0]!.value);
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className={cn('h-32 w-full', className)} preserveAspectRatio="none" role="img" aria-label="Success rate">
        <line x1={pad} y1={cy} x2={w - pad} y2={cy} stroke={color} strokeWidth={2} strokeDasharray="4 4" opacity={0.7} />
        <circle cx={w / 2} cy={cy} r={4} fill={color} />
      </svg>
    );
  }
  const step = (w - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => [pad + i * step, y(p.value)] as const);
  const line = coords.map(([x, yy], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yy.toFixed(1)}`).join(' ');
  const area = `${line} L${coords[coords.length - 1]![0].toFixed(1)},${h - pad} L${pad},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn('h-32 w-full', className)} preserveAspectRatio="none" role="img" aria-label="Success rate trend">
      <path d={area} fill={color} opacity={0.12} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} />
      {coords.map(([x, yy], i) => <circle key={i} cx={x} cy={yy} r={3} fill={color} />)}
    </svg>
  );
}

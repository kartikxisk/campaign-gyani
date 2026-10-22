'use client';
import { useConfig } from '@/lib/config';

// Brand-consistent full-screen loader for the admin shell: the logo over a
// sent→opened→clicked→submitted→caught signal ramp (the funnel palette).
const RAMP = ['var(--cg-sent)', 'var(--cg-opened)', 'var(--cg-clicked)', 'var(--cg-submitted)', 'var(--cg-reported)'];

export function ConsoleLoading({ redirecting = false }: { redirecting?: boolean }) {
  const { brandName, logoUrl } = useConfig();
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-deck">
      {/* soft aurora, matching the login backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-50"
        style={{ background: 'radial-gradient(60% 50% at 50% 40%, color-mix(in srgb, var(--cg-primary) 18%, transparent), transparent 70%)' }} />

      <div className="relative flex flex-col items-center gap-5">
        {logoUrl ? <img src={logoUrl} alt={brandName} className="h-12 w-auto max-w-[200px] object-contain" /> : null}

        <div className="flex h-7 items-end gap-1.5" role="progressbar" aria-label="Loading">
          {RAMP.map((c, i) => (
            <span key={i} className="cg-signal w-1.5 rounded-full"
              style={{ background: c, height: `${12 + i * 4}px`, animationDelay: `${i * 130}ms` }} />
          ))}
        </div>

        <p className="text-sm text-deck-muted">{redirecting ? 'Taking you to sign in…' : 'Loading console…'}</p>
      </div>

      <style>{`
        @keyframes cg-signal { 0%,100% { transform: scaleY(0.45); opacity: 0.45 } 50% { transform: scaleY(1); opacity: 1 } }
        .cg-signal { transform-origin: bottom; animation: cg-signal 1.1s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

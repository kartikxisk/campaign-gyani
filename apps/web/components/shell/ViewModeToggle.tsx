'use client';
import { cn } from '@cg/ui';
import { useViewMode, type ViewMode } from '@/lib/view-mode';

const OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'phishing', label: 'Phishing' },
  { value: 'email', label: 'Email' },
];

export function ViewModeToggle() {
  const { mode, setMode } = useViewMode();
  return (
    <div role="group" aria-label="Console mode" className="flex items-center rounded-cg-sm bg-white/5 p-0.5">
      {OPTIONS.map((o) => {
        const active = mode === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => setMode(o.value)}
            className={cn(
              'rounded-[6px] px-2.5 py-1 text-xs font-medium transition-colors',
              active ? 'bg-primary text-primary-ink' : 'text-deck-muted hover:text-deck-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

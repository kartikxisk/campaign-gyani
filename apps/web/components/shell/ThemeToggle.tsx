'use client';
import { useEffect, useState } from 'react';

type Theme = 'system' | 'light' | 'dark';

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  try { localStorage.setItem('cg-theme', theme); } catch { /* ignore */ }
}

const ICON = { system: '◐', light: '☀', dark: '☾' } as const;
const NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
const LABEL: Record<Theme, string> = { system: 'System theme', light: 'Light theme', dark: 'Dark theme' };

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  useEffect(() => {
    try { const t = (localStorage.getItem('cg-theme') as Theme) || 'system'; setTheme(t); } catch { /* ignore */ }
  }, []);
  const cycle = () => { const n = NEXT[theme]; setTheme(n); apply(n); };
  return (
    <button onClick={cycle} title={LABEL[theme]} aria-label={LABEL[theme]}
      className="flex h-8 w-8 items-center justify-center rounded-cg-sm text-base text-deck-muted transition-colors hover:bg-white/5 hover:text-deck-ink">
      {ICON[theme]}
    </button>
  );
}

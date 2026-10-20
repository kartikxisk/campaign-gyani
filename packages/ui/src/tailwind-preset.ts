import type { Config } from 'tailwindcss';

/** Shared Tailwind preset mapping CG tokens to utility classes. */
export const cgPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        ink: 'var(--cg-ink)',
        'ink-soft': 'var(--cg-ink-soft)',
        muted: 'var(--cg-muted)',
        surface: 'var(--cg-surface)',
        panel: 'var(--cg-panel)',
        'panel-2': 'var(--cg-panel-2)',
        deck: 'var(--cg-deck)',
        'deck-2': 'var(--cg-deck-2)',
        'deck-line': 'var(--cg-deck-line)',
        'deck-ink': 'var(--cg-deck-ink)',
        'deck-muted': 'var(--cg-deck-muted)',
        line: 'var(--cg-line)',
        'line-strong': 'var(--cg-line-strong)',
        primary: 'var(--cg-primary)',
        'primary-ink': 'var(--cg-primary-ink)',
        'primary-soft': 'var(--cg-primary-soft)',
        danger: 'var(--cg-danger)',
        'danger-soft': 'var(--cg-danger-soft)',
        ok: 'var(--cg-ok)',
        warn: 'var(--cg-warn)',
        sent: 'var(--cg-sent)',
        opened: 'var(--cg-opened)',
        clicked: 'var(--cg-clicked)',
        submitted: 'var(--cg-submitted)',
        reported: 'var(--cg-reported)',
      },
      fontFamily: {
        sans: 'var(--cg-font-sans)',
        display: 'var(--cg-font-display)',
        mono: 'var(--cg-font-mono)',
      },
      borderRadius: { cg: 'var(--cg-radius)', 'cg-sm': 'var(--cg-radius-sm)' },
      boxShadow: { cg: 'var(--cg-shadow)', 'cg-pop': 'var(--cg-shadow-pop)' },
    },
  },
};

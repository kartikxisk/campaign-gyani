import type { Config } from 'tailwindcss';

const token = (name: string) => `var(--cg-${name})`;

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './modules/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: token('ink'), 'ink-soft': token('ink-soft'), muted: token('muted'),
        surface: token('surface'), panel: token('panel'), 'panel-2': token('panel-2'), line: token('line'), 'line-strong': token('line-strong'),
        deck: token('deck'), 'deck-2': token('deck-2'), 'deck-line': token('deck-line'), 'deck-ink': token('deck-ink'), 'deck-muted': token('deck-muted'),
        primary: token('primary'), 'primary-ink': token('primary-ink'), 'primary-soft': token('primary-soft'),
        danger: token('danger'), 'danger-soft': token('danger-soft'), ok: token('ok'), warn: token('warn'),
        sent: token('sent'), opened: token('opened'), clicked: token('clicked'), submitted: token('submitted'), reported: token('reported'),
      },
      fontFamily: { sans: token('font-sans'), display: token('font-display'), mono: token('font-mono') },
      borderRadius: { cg: token('radius'), 'cg-sm': token('radius-sm') },
      boxShadow: { cg: token('shadow'), 'cg-pop': token('shadow-pop') },
    },
  },
  plugins: [],
};
export default config;

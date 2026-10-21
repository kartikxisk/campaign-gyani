import type { Config } from 'tailwindcss';

const token = (name: string) => `var(--cg-${name})`;

// Tokens are plain hex vars, so Tailwind can't split them into channels for
// opacity modifiers (`text-muted/70` would emit nothing). Mix with transparent instead.
// Tailwind accepts function colors at runtime; its Config type only lists strings.
const color = (name: string) => (({ opacityValue }: { opacityValue?: string }) => {
  if (opacityValue === undefined || opacityValue.startsWith('var(')) return token(name);
  const n = Number(opacityValue);
  const pct = Number.isFinite(n) ? `${Math.round(n * 1000) / 10}%` : `calc(${opacityValue} * 100%)`;
  return `color-mix(in srgb, ${token(name)} ${pct}, transparent)`;
}) as unknown as string;

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
        ink: color('ink'), 'ink-soft': color('ink-soft'), muted: color('muted'),
        surface: color('surface'), panel: color('panel'), 'panel-2': color('panel-2'), line: color('line'), 'line-strong': color('line-strong'),
        deck: color('deck'), 'deck-2': color('deck-2'), 'deck-line': color('deck-line'), 'deck-ink': color('deck-ink'), 'deck-muted': color('deck-muted'),
        primary: color('primary'), 'primary-ink': color('primary-ink'), 'primary-soft': color('primary-soft'),
        danger: color('danger'), 'danger-soft': color('danger-soft'), ok: color('ok'), warn: color('warn'),
        sent: color('sent'), opened: color('opened'), clicked: color('clicked'), submitted: color('submitted'), reported: color('reported'),
      },
      fontFamily: { sans: token('font-sans'), display: token('font-display'), mono: token('font-mono') },
      borderRadius: { cg: token('radius'), 'cg-sm': token('radius-sm') },
      boxShadow: { cg: token('shadow'), 'cg-pop': token('shadow-pop') },
    },
  },
  plugins: [],
};
export default config;

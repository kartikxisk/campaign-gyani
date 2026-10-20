import { cn } from './cn';
import type { ReactNode } from 'react';

type Tone = 'neutral' | 'sent' | 'opened' | 'clicked' | 'submitted' | 'reported' | 'ok' | 'danger' | 'warn';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface text-ink-soft border-line-strong',
  sent: 'text-sent border-sent/30 bg-sent/10',
  opened: 'text-opened border-opened/30 bg-opened/10',
  clicked: 'text-clicked border-clicked/30 bg-clicked/10',
  submitted: 'text-submitted border-submitted/30 bg-submitted/10',
  reported: 'text-reported border-reported/30 bg-reported/10',
  ok: 'text-ok border-ok/30 bg-ok/10',
  danger: 'text-danger border-danger/30 bg-danger/10',
  warn: 'text-warn border-warn/30 bg-warn/10',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', tones[tone], className)}>{children}</span>;
}

/** Maps a result status to its badge tone. */
export const statusTone: Record<string, Tone> = {
  SCHEDULED: 'neutral', SENDING: 'neutral', SENT: 'sent', OPENED: 'opened',
  CLICKED: 'clicked', SUBMITTED: 'submitted', REPORTED: 'reported', ERROR: 'danger',
  DRAFT: 'neutral', RUNNING: 'opened', PAUSED: 'warn', COMPLETE: 'ok',
};

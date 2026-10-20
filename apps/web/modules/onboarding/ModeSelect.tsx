'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AppMode } from '@cg/shared';
import { Button } from '@cg/ui';
import { api } from '@/lib/api-client';

const CHOICES: { mode: AppMode; title: string; body: string; points: string[] }[] = [
  {
    mode: 'phishing',
    title: 'Phishing simulation',
    body: 'Run authorized awareness tests. Track who opens, clicks, and hands over credentials on a landing page.',
    points: ['Landing pages with capture', 'Full funnel: sent → opened → clicked → submitted → reported', 'Susceptibility & success rate'],
  },
  {
    mode: 'email',
    title: 'Email campaign',
    body: 'Send real emails and measure engagement. Links go to your own URLs; we track opens and clicks.',
    points: ['Links go to your real URLs', 'Opens & clicks only — no capture', 'Open rate & click rate'],
  },
];

export function ModeSelect() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<AppMode | null>(null);

  const choose = async (mode: AppMode) => {
    setBusy(mode);
    try {
      await api.post('/settings/mode', { mode });
      await qc.invalidateQueries({ queryKey: ['settings', 'mode'] });
    } catch {
      setBusy(null);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-deck px-4 py-10">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-cg bg-primary font-display text-lg font-bold text-primary-ink">cg</div>
          <h1 className="font-display text-2xl font-semibold text-deck-ink">How will you use Campaign-Gyani?</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-deck-muted">Pick one to set up this workspace. This choice is permanent &mdash; it can&rsquo;t be changed later.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {CHOICES.map((c) => (
            <div key={c.mode} className="flex flex-col rounded-cg border border-deck-line bg-deck-2 p-6">
              <h2 className="font-display text-lg font-semibold text-deck-ink">{c.title}</h2>
              <p className="mt-1.5 text-sm text-deck-muted">{c.body}</p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-deck-muted">
                {c.points.map((p) => <li key={p} className="flex gap-2"><span className="text-primary">&bull;</span>{p}</li>)}
              </ul>
              <Button className="mt-5 w-full" onClick={() => choose(c.mode)} disabled={busy !== null}>
                {busy === c.mode ? 'Setting up…' : `Use ${c.title.toLowerCase()}`}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

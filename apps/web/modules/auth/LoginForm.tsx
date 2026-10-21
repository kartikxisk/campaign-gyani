'use client';
import { useState } from 'react';
import { z } from 'zod';
import { api } from '@/lib/api-client';

const emailSchema = z.string().email();

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [stage, setStage] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const field =
    'w-full border-0 border-b border-line bg-transparent px-0 py-2 text-[15px] text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-0';

  const next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSchema.safeParse(email).success) { setError("Enter a valid email address."); return; }
    setError(null);
    setStage('password');
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { setError('Enter your password.'); return; }
    setBusy(true);
    setError(null);
    try {
      await api.post('/auth/login', { email, password });
      api.clearCsrf();
      onSuccess();
    } catch {
      setError("Your account or password is incorrect.");
    } finally {
      setBusy(false);
    }
  };

  if (stage === 'email') {
    return (
      <form onSubmit={next} noValidate>
        <h1 className="font-display text-[22px] font-semibold text-ink">Sign in</h1>
        <div className="mt-6">
          <label htmlFor="email" className="sr-only">Email</label>
          <input id="email" type="email" autoFocus autoComplete="username" placeholder="Email" className={field}
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-8 flex justify-end">
          <button type="submit" className="h-9 min-w-[108px] rounded-cg-sm bg-primary px-5 text-sm font-semibold text-primary-ink transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">Next</button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={signIn} noValidate>
      <button type="button" onClick={() => { setStage('email'); setError(null); }} className="mb-4 flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <span aria-hidden>←</span> {email}
      </button>
      <h1 className="font-display text-[22px] font-semibold text-ink">Enter password</h1>
      <div className="mt-6">
        <label htmlFor="password" className="sr-only">Password</label>
        <input id="password" type="password" autoFocus autoComplete="current-password" placeholder="Password" className={field}
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-8 flex justify-end">
        <button type="submit" disabled={busy} className="h-9 min-w-[108px] rounded-cg-sm bg-primary px-5 text-sm font-semibold text-primary-ink transition hover:brightness-110 active:translate-y-px disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">{busy ? 'Signing in…' : 'Sign in'}</button>
      </div>
    </form>
  );
}

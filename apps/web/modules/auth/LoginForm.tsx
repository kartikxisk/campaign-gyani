'use client';
import { useState } from 'react';
import { z } from 'zod';
import { Button, Field, Input } from '@cg/ui';
import { api } from '@/lib/api-client';

const emailSchema = z.string().email();

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSchema.safeParse(email).success) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post('/auth/login', { email, password });
      api.clearCsrf();
      onSuccess();
    } catch {
      setError('Your email or password is incorrect.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={signIn} noValidate className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Sign in</h1>
        <p className="mt-1.5 text-sm text-muted">Access your campaign console.</p>
      </div>

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          type="email"
          autoFocus
          autoComplete="username"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={busy} className="w-full">
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}

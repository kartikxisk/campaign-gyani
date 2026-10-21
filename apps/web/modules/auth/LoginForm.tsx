'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginDto } from '@cg/shared';
import { useState } from 'react';
import { api } from '@/lib/api-client';

const field =
  'cg-login-input w-full rounded-cg-sm border border-deck-line bg-deck-2 px-3.5 py-2.5 text-[15px] text-deck-ink placeholder:text-deck-muted/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30';

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginDto>({ resolver: zodResolver(loginSchema) });
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await api.post('/auth/login', values);
      api.clearCsrf();
      onSuccess();
    } catch {
      setServerError('Those credentials did not match. Try again.');
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-deck-ink">Email</label>
        <input id="email" type="email" autoComplete="username" placeholder="you@company.com" className={field} {...register('email')} />
        {errors.email?.message && <p className="text-xs text-submitted">{errors.email.message}</p>}
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-deck-ink">Password</label>
        <input id="password" type="password" autoComplete="current-password" placeholder="••••••••" className={field} {...register('password')} />
        {errors.password?.message && <p className="text-xs text-submitted">{errors.password.message}</p>}
      </div>

      {serverError && (
        <p role="alert" className="rounded-cg-sm border border-submitted/30 bg-submitted/10 px-3 py-2 text-sm text-submitted">{serverError}</p>
      )}

      <button type="submit" disabled={isSubmitting}
        className="mt-1 flex h-11 w-full items-center justify-center rounded-cg-sm bg-primary text-[15px] font-semibold text-primary-ink transition-[filter,transform] hover:brightness-110 active:translate-y-px disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginDto } from '@cg/shared';
import { Button, Field, Input } from '@cg/ui';
import { useState } from 'react';
import { api } from '@/lib/api-client';

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
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="username" {...register('email')} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
      </Field>
      {serverError ? <p role="alert" className="text-sm text-danger">{serverError}</p> : null}
      <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</Button>
    </form>
  );
}

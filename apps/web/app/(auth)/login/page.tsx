'use client';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/modules/auth/LoginForm';

export default function LoginPage() {
  const router = useRouter();
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-cg bg-primary font-display text-lg font-bold text-primary-ink">cg</div>
          <h1 className="font-display text-xl font-semibold text-ink">Campaign-Gyani</h1>
          <p className="mt-1 text-sm text-muted">Sign in to the awareness console.</p>
        </div>
        <div className="rounded-cg border border-line bg-panel p-6 shadow-cg">
          <LoginForm onSuccess={() => router.replace('/')} />
        </div>
      </div>
    </main>
  );
}

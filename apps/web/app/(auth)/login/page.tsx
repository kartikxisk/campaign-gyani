'use client';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/modules/auth/LoginForm';
import { useConfig } from '@/lib/config';

export default function LoginPage() {
  const router = useRouter();
  const { brandName, logoUrl } = useConfig();
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {logoUrl
            ? <img src={logoUrl} alt="" className="mx-auto mb-3 h-11 w-11 rounded-cg object-contain" />
            : <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-cg bg-primary font-display text-lg font-bold text-primary-ink">{initials(brandName)}</div>}
          <h1 className="font-display text-xl font-semibold text-ink">{brandName}</h1>
          <p className="mt-1 text-sm text-muted">Sign in to the awareness console.</p>
        </div>
        <div className="rounded-cg border border-line bg-panel p-6 shadow-cg">
          <LoginForm onSuccess={() => router.replace('/')} />
        </div>
      </div>
    </main>
  );
}

function initials(name: string): string {
  const parts = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return (parts.length >= 2 ? parts[0]![0]! + parts[1]![0]! : (parts[0] ?? '').slice(0, 2)).toLowerCase();
}

'use client';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/modules/auth/LoginForm';
import { useConfig } from '@/lib/config';

export default function LoginPage() {
  const router = useRouter();
  const { brandName, logoUrl } = useConfig();

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-[400px] rounded-cg border border-line bg-panel px-10 py-11 shadow-cg-pop">
        <div className="mb-8">
          {logoUrl
            ? <img src={logoUrl} alt={brandName} className="h-9 w-9 rounded-cg-sm object-contain" />
            : <span className="flex h-9 w-9 items-center justify-center rounded-cg-sm bg-primary font-display text-sm font-bold text-primary-ink">{initials(brandName)}</span>}
        </div>
        <LoginForm onSuccess={() => router.replace('/')} />
      </div>
    </main>
  );
}

function initials(name: string): string {
  const parts = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return (parts.length >= 2 ? parts[0]![0]! + parts[1]![0]! : (parts[0] ?? '').slice(0, 2)).toLowerCase();
}

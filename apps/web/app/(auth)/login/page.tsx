'use client';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/modules/auth/LoginForm';
import { useConfig } from '@/lib/config';

export default function LoginPage() {
  const router = useRouter();
  const { brandName, logoUrl } = useConfig();

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-deck px-5 py-10">
      {/* faint telemetry grid, quiet */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'linear-gradient(var(--cg-deck-ink) 1px, transparent 1px), linear-gradient(90deg, var(--cg-deck-ink) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

      <div className="relative w-full max-w-[360px] motion-safe:animate-[loginIn_.5s_ease-out]">
        <div className="mb-8">
          <div className="flex items-center gap-2.5">
            {logoUrl
              ? <img src={logoUrl} alt="" className="h-9 w-9 rounded-cg-sm object-contain" />
              : <span className="flex h-9 w-9 items-center justify-center rounded-cg-sm bg-primary font-display text-sm font-bold text-primary-ink">{initials(brandName)}</span>}
            <span className="font-display text-[15px] font-semibold text-deck-ink">{brandName}</span>
          </div>
          {/* sent → caught signature */}
          <div className="mt-5 h-[3px] w-28 rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--cg-sent), var(--cg-opened), var(--cg-clicked), var(--cg-submitted), var(--cg-reported))' }} />
          <h1 className="mt-6 font-display text-[28px] font-semibold leading-tight text-deck-ink">Sign in</h1>
          <p className="mt-1.5 text-sm text-deck-muted">Pick up where your campaigns left off.</p>
        </div>

        <LoginForm onSuccess={() => router.replace('/')} />

        <p className="mt-8 text-center text-xs text-deck-muted/70">Authorized access only.</p>
      </div>

      <style jsx global>{`
        @keyframes loginIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </main>
  );
}

function initials(name: string): string {
  const parts = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return (parts.length >= 2 ? parts[0]![0]! + parts[1]![0]! : (parts[0] ?? '').slice(0, 2)).toLowerCase();
}

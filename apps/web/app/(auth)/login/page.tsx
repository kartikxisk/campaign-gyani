'use client';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/modules/auth/LoginForm';
import { useConfig } from '@/lib/config';
import { PhishMark } from '@/components/shell/PhishMark';

export default function LoginPage() {
  const router = useRouter();
  const { brandName, logoUrl } = useConfig();

  const Mark = ({ size }: { size: number }) =>
    logoUrl
      ? <img src={logoUrl} alt={brandName} style={{ height: size, width: size }} className="rounded-cg-sm object-contain" />
      : <span style={{ height: size, width: size }} className="flex items-center justify-center rounded-cg-sm bg-primary text-primary-ink" aria-label={brandName}><PhishMark className="h-3/5 w-3/5" tone="ink" /></span>;

  return (
    <main className="grid min-h-screen lg:grid-cols-[46fr_54fr]">
      {/* Brand panel — hidden on small screens */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-deck p-12 lg:flex">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'linear-gradient(var(--cg-deck-ink) 1px, transparent 1px), linear-gradient(90deg, var(--cg-deck-ink) 1px, transparent 1px)', backgroundSize: '52px 52px' }} />
        <div className="relative"><Mark size={40} /></div>
        <div className="relative max-w-sm">
          <PhishMark className="mb-8 h-36 w-auto" />
          <h2 className="font-display text-[34px] font-semibold leading-[1.15] text-deck-ink">Run the drill. Watch who takes the bait.</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-deck-muted">Launch phishing simulations and email campaigns, then track every open, click and catch.</p>
          <div className="mt-6 h-[3px] w-32 rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--cg-sent), var(--cg-opened), var(--cg-clicked), var(--cg-submitted), var(--cg-reported))' }} />
        </div>
        <div className="relative text-xs text-deck-muted/60">Authorized security testing only.</div>
      </aside>

      {/* Sign-in */}
      <section className="flex items-center justify-center bg-surface px-6 py-12">
        <div className="w-full max-w-[360px]">
          <div className="mb-8 lg:hidden"><Mark size={36} /></div>
          <LoginForm onSuccess={() => router.replace('/')} />
        </div>
      </section>
    </main>
  );
}

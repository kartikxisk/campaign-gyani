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
      : null;

  return (
    <main className="grid min-h-screen lg:grid-cols-[46fr_54fr]">
      {/* Brand panel — hidden on small screens */}
      <aside className="relative hidden flex-col justify-center overflow-hidden bg-deck p-12 lg:flex">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="cg-aurora cg-aurora-a" style={{ top: '-10%', left: '-8%', width: '60%', height: '60%', background: 'radial-gradient(circle, var(--cg-primary), transparent 70%)' }} />
          <div className="cg-aurora cg-aurora-b" style={{ bottom: '-14%', left: '18%', width: '55%', height: '55%', background: 'radial-gradient(circle, var(--cg-submitted), transparent 70%)' }} />
          <div className="cg-aurora cg-aurora-c" style={{ top: '22%', right: '-12%', width: '52%', height: '52%', background: 'radial-gradient(circle, var(--cg-clicked), transparent 70%)' }} />
        </div>
        {logoUrl && <div className="absolute left-12 top-12"><Mark size={40} /></div>}
        <div className="relative max-w-sm">
          <PhishMark className="mb-8 h-36 w-auto" />
          <h2 className="font-display text-[34px] font-semibold leading-[1.15] text-deck-ink">Run the drill. Watch who takes the bait.</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-deck-muted">Launch phishing simulations and email campaigns, then track every open, click and catch.</p>
          <div className="mt-6 h-[3px] w-32 rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--cg-sent), var(--cg-opened), var(--cg-clicked), var(--cg-submitted), var(--cg-reported))' }} />
        </div>
        <div className="absolute bottom-12 left-12 text-xs text-deck-muted/70">Authorized security testing only.</div>
      </aside>

      {/* Sign-in */}
      <section className="flex items-center justify-center bg-surface px-6 py-12">
        <div className="cg-signin-rise w-full max-w-[360px]">
          {logoUrl && <div className="mb-8 lg:hidden"><Mark size={36} /></div>}
          <LoginForm onSuccess={() => router.replace('/')} />
        </div>
      </section>
    </main>
  );
}

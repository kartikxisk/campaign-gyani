'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { useMe } from '@/lib/auth';
import { useMode } from '@/lib/mode';
import { ModeSelect } from '@/modules/onboarding/ModeSelect';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: me, isLoading } = useMe();
  const { mode, isLoading: modeLoading } = useMode();

  useEffect(() => {
    if (!isLoading && me === null) router.replace('/login');
  }, [isLoading, me, router]);

  if (isLoading || !me || modeLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-deck text-sm text-deck-muted">
        <span className="animate-pulse">Loading console…</span>
      </div>
    );
  }

  if (mode === null) return <ModeSelect />;

  return (
    <div className="flex min-h-screen bg-deck">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar me={me} />
        <main className="flex-1 bg-surface px-4 py-6 md:rounded-tl-[20px] md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { useMe } from '@/lib/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: me, isLoading } = useMe();

  useEffect(() => {
    if (!isLoading && me === null) router.replace('/login');
  }, [isLoading, me, router]);

  if (isLoading || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-deck text-sm text-deck-muted">
        <span className="animate-pulse">Loading console…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-deck">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar me={me} />
        <main className="flex-1 bg-surface px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

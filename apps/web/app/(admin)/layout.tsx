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
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar me={me} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}

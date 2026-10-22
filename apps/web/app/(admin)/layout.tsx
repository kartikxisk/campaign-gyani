'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { ConsoleLoading } from '@/components/shell/ConsoleLoading';
import { useMe } from '@/lib/auth';
import { ViewModeProvider } from '@/lib/view-mode';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: me, isPending, isError } = useMe();

  // No session, or /me failed — send to login. (isError covers API/network
  // failures so the loader can never hang indefinitely.)
  useEffect(() => {
    if (!isPending && (me === null || isError)) router.replace('/login');
  }, [isPending, me, isError, router]);

  if (!me) return <ConsoleLoading redirecting={!isPending} />;


  return (
    <ViewModeProvider>
      <div className="flex min-h-screen bg-deck">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 bg-surface px-4 py-6 md:rounded-tl-[20px] md:px-8 md:py-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </ViewModeProvider>
  );
}

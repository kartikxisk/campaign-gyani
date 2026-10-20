'use client';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@cg/ui';
import { api } from '@/lib/api-client';
import type { AdminProfile } from '@/lib/auth';

export function Topbar({ me }: { me: AdminProfile }) {
  const router = useRouter();
  const qc = useQueryClient();
  const logout = async () => {
    await api.post('/auth/logout').catch(() => undefined);
    api.clearCsrf();
    qc.clear();
    router.replace('/login');
  };
  return (
    <header className="flex items-center justify-between border-b border-line bg-panel/80 px-6 py-3 backdrop-blur">
      <div />
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted">{me.email}</span>
        <Button variant="ghost" size="sm" onClick={logout}>Sign out</Button>
      </div>
    </header>
  );
}

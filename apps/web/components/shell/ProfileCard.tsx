'use client';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Menu } from '@cg/ui';
import { api } from '@/lib/api-client';
import { useMe } from '@/lib/auth';

export function ProfileCard({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me } = useMe();

  const logout = async () => {
    await api.post('/auth/logout').catch(() => undefined);
    api.clearCsrf();
    qc.clear();
    router.replace('/login');
  };

  const email = me?.email ?? '';
  const letter = (email[0] ?? '?').toUpperCase();

  return (
    <div className="border-t border-deck-line p-3">
      <Menu
        label=""
        items={[
          { label: 'Settings', onSelect: () => { onNavigate?.(); router.push('/settings'); } },
          { label: 'Sign out', onSelect: logout, destructive: true },
        ]}
        trigger={
          <button className="flex w-full items-center gap-2.5 rounded-cg-sm px-2 py-2 text-left transition-colors hover:bg-white/5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-ink">{letter}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-deck-ink">{email || 'Account'}</span>
              <span className="block text-xs text-deck-muted">Admin</span>
            </span>
            <span aria-hidden className="text-deck-muted">⋯</span>
          </button>
        }
      />
    </div>
  );
}

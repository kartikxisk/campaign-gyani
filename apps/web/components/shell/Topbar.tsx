'use client';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { api } from '@/lib/api-client';
import type { AdminProfile } from '@/lib/auth';
import { Icon } from './icons';
import { Brand, NavLinks } from './Sidebar';
import { NAV_GROUPS } from './nav';
import { ThemeToggle } from './ThemeToggle';

function crumb(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  const seg = pathname.split('/')[1] ?? '';
  const found = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.href === `/${seg}`);
  return found?.label ?? seg.replace(/-/g, ' ');
}

export function Topbar({ me }: { me: AdminProfile }) {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const [navOpen, setNavOpen] = useState(false);

  const logout = async () => {
    await api.post('/auth/logout').catch(() => undefined);
    api.clearCsrf();
    qc.clear();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-deck-line bg-deck px-4 py-3 text-deck-ink md:px-6">
      <Dialog.Root open={navOpen} onOpenChange={setNavOpen}>
        <Dialog.Trigger className="rounded-cg-sm p-1.5 text-deck-muted hover:bg-white/5 hover:text-deck-ink md:hidden" aria-label="Open navigation">
          <Icon.menu />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 md:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-deck md:hidden">
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Brand />
            <NavLinks onNavigate={() => setNavOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="font-display text-sm font-medium capitalize text-deck-ink">{crumb(pathname)}</div>
      <div className="ml-auto flex items-center gap-3 text-sm">
        <ThemeToggle />
        <span className="hidden text-deck-muted sm:inline">{me.email}</span>
        <button onClick={logout} className="flex items-center gap-1.5 rounded-cg-sm px-2.5 py-1.5 text-deck-muted transition-colors hover:bg-white/5 hover:text-deck-ink">
          <Icon.logout width={16} height={16} /> Sign out
        </button>
      </div>
    </header>
  );
}

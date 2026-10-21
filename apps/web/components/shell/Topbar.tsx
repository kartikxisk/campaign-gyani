'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { Icon } from './icons';
import { Brand, NavLinks } from './Sidebar';
import { ProfileCard } from './ProfileCard';
import { NAV_GROUPS } from './nav';
import { ThemeToggle } from './ThemeToggle';
import { ViewModeToggle } from './ViewModeToggle';

function crumb(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  const seg = pathname.split('/')[1] ?? '';
  const found = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.href === `/${seg}`);
  return found?.label ?? seg.replace(/-/g, ' ');
}

export function Topbar() {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);


  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 bg-deck px-4 py-3 text-deck-ink md:px-6">
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
            <ProfileCard onNavigate={() => setNavOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="font-display text-sm font-medium capitalize text-deck-ink">{crumb(pathname)}</div>
      <div className="ml-auto flex items-center gap-2 text-sm">
        <ViewModeToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}

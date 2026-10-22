'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { Icon } from './icons';
import { Brand, NavLinks } from './Sidebar';
import { ProfileCard } from './ProfileCard';
import { NAV_GROUPS } from './nav';
import { ThemeToggle } from './ThemeToggle';
import { ViewModeToggle } from './ViewModeToggle';

interface Crumb { label: string; href: string; last: boolean }

function buildCrumbs(pathname: string): Crumb[] {
  const trail: Crumb[] = [{ label: 'Dashboard', href: '/', last: pathname === '/' }];
  if (pathname === '/') return trail;
  const segs = pathname.split('/').filter(Boolean);
  const navItems = NAV_GROUPS.flatMap((g) => g.items);
  let acc = '';
  segs.forEach((seg, i) => {
    acc += `/${seg}`;
    const nav = navItems.find((it) => it.href === `/${seg}`);
    let label: string;
    if (nav) label = nav.label;
    else if (seg === 'new') label = 'New';
    else if (seg === 'edit') label = 'Edit';
    else if (/^[a-z0-9]{12,}$/i.test(seg)) label = 'Detail'; // opaque id (cuid)
    else label = seg.replace(/-/g, ' ');
    trail.push({ label, href: acc, last: i === segs.length - 1 });
  });
  return trail;
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const crumbs = buildCrumbs(pathname);
  const showBack = pathname !== '/';


  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 bg-deck px-4 py-3 text-deck-ink md:px-6">
      {/* Keeps main's rounded top-left corner visible while content scrolls beneath */}
      <div aria-hidden className="pointer-events-none absolute left-0 top-full hidden h-5 w-5 md:block"
        style={{ background: 'radial-gradient(circle at 100% 100%, transparent 20px, var(--cg-deck) 20.5px)' }} />
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

      {showBack && (
        <button type="button" onClick={() => router.back()} aria-label="Go back" title="Back"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-cg-sm text-deck-muted transition-colors hover:bg-white/5 hover:text-deck-ink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      )}
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => (
          <span key={c.href} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <span aria-hidden className="text-deck-muted/50">/</span>}
            {c.last
              ? <span aria-current="page" className="truncate font-display font-medium capitalize text-deck-ink">{c.label}</span>
              : <Link href={c.href} className="truncate capitalize text-deck-muted transition-colors hover:text-deck-ink">{c.label}</Link>}
          </span>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2 text-sm">
        <ViewModeToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}

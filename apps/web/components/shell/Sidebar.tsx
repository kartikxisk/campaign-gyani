'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@cg/ui';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/campaigns', label: 'Campaigns' },
  { href: '/templates', label: 'Email templates' },
  { href: '/landing-pages', label: 'Landing pages' },
  { href: '/sending-profiles', label: 'Sending profiles' },
  { href: '/groups', label: 'Target groups' },
  { href: '/assets', label: 'Assets' },
  { href: '/settings', label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-line bg-panel md:flex md:flex-col">
      <div className="flex items-center gap-2 px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-cg-sm bg-primary font-display text-sm font-bold text-primary-ink">cg</span>
        <span className="font-display font-semibold text-ink">Campaign-Gyani</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {NAV.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={cn('block rounded-cg-sm px-3 py-2 text-sm font-medium', active ? 'bg-primary-soft text-ink' : 'text-ink-soft hover:bg-surface')}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

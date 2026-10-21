'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@cg/ui';
import { Icon } from './icons';
import { navFor } from './nav';
import { useConfig } from '@/lib/config';
import { useViewMode } from '@/lib/view-mode';
import { ProfileCard } from './ProfileCard';

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { mode } = useViewMode();
  const groups = navFor(mode);
  return (
    <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {groups.map((group) => (
        <div key={group.heading}>
          <div className="px-3 pb-1.5 text-[11px] font-medium text-deck-muted/70">{group.heading}</div>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Ico = Icon[item.icon];
              return (
                <Link key={item.href} href={item.href} onClick={onNavigate}
                  className={cn('group relative flex items-center gap-3 rounded-cg-sm px-3 py-2 text-sm transition-colors',
                    active ? 'bg-white/[0.07] text-deck-ink' : 'text-deck-muted hover:bg-white/[0.04] hover:text-deck-ink')}>
                  {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" />}
                  <Ico className={cn('shrink-0', active ? 'text-primary' : 'text-deck-muted group-hover:text-deck-ink')} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function Brand() {
  const { brandName, logoUrl } = useConfig();
  if (!logoUrl) return <div aria-hidden className="h-16 shrink-0" />;
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 px-5 py-4">
      <img src={logoUrl} alt="" className="h-8 w-8 rounded-cg-sm object-contain" />
      <span className="font-display font-semibold text-deck-ink">{brandName}</span>
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-deck md:flex">
      <Brand />
      <NavLinks />
      <ProfileCard />
    </aside>
  );
}

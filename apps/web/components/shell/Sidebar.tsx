'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@cg/ui';
import { Icon } from './icons';
import { NAV_GROUPS } from './nav';
import { useMode } from '@/lib/mode';

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { mode } = useMode();
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !(mode === 'email' && i.href === '/landing-pages') && !(mode !== 'email' && i.href === '/suppressions')) })).filter((g) => g.items.length > 0);
  return (
    <nav className="flex-1 space-y-6 px-3 py-4">
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
  return (
    <Link href="/" className="flex items-center gap-2.5 px-5 py-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-cg-sm bg-primary font-display text-sm font-bold text-primary-ink">cg</span>
      <span className="font-display font-semibold text-deck-ink">Campaign-Gyani</span>
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-deck md:flex">
      <Brand />
      <NavLinks />
      <div className="px-5 py-3 text-[11px] text-deck-muted/60">Awareness console</div>
    </aside>
  );
}

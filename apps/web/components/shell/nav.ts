import { Icon } from './icons';
import type { ViewMode } from '@/lib/view-mode';

type NavItem = { href: string; label: string; icon: keyof typeof Icon; modes?: ViewMode[] };

// `modes` limits an item to those console modes; omitted means both.
export const NAV_GROUPS: { heading: string; items: NavItem[] }[] = [
  { heading: 'Operate', items: [
    { href: '/', label: 'Dashboard', icon: 'dashboard' },
    { href: '/campaigns', label: 'Campaigns', icon: 'campaign' },
  ] },
  { heading: 'Content', items: [
    { href: '/templates', label: 'Email templates', icon: 'template' },
    // Email campaigns link to real URLs, so landing pages only serve phishing.
    { href: '/landing-pages', label: 'Landing pages', icon: 'landing', modes: ['phishing'] },
    { href: '/sending-profiles', label: 'Sending profiles', icon: 'smtp' },
    { href: '/assets', label: 'Assets', icon: 'assets' },
  ] },
  { heading: 'Audience', items: [
    { href: '/groups', label: 'Target groups', icon: 'groups' },
    { href: '/suppressions', label: 'Suppressions', icon: 'suppression' },
  ] },
  { heading: 'Workspace', items: [
    { href: '/settings', label: 'Settings', icon: 'settings' },
  ] },
];

const inMode = (item: NavItem, mode: ViewMode) => !item.modes || item.modes.includes(mode);

/** The nav groups visible in a console mode; groups left empty are dropped. */
export function navFor(mode: ViewMode) {
  return NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => inMode(i, mode)) }))
    .filter((g) => g.items.length > 0);
}

/** Whether a route belongs to a nav item the mode shows (routes outside the nav always are). */
export function isAvailableIn(pathname: string, mode: ViewMode): boolean {
  const owner = NAV_GROUPS.flatMap((g) => g.items)
    .find((i) => i.href !== '/' && (pathname === i.href || pathname.startsWith(`${i.href}/`)));
  return !owner || inMode(owner, mode);
}

import { Icon } from './icons';
export const NAV_GROUPS: { heading: string; items: { href: string; label: string; icon: keyof typeof Icon }[] }[] = [
  { heading: 'Operate', items: [
    { href: '/', label: 'Dashboard', icon: 'dashboard' },
    { href: '/campaigns', label: 'Campaigns', icon: 'campaign' },
  ] },
  { heading: 'Content', items: [
    { href: '/templates', label: 'Email templates', icon: 'template' },
    { href: '/landing-pages', label: 'Landing pages', icon: 'landing' },
    { href: '/sending-profiles', label: 'Sending profiles', icon: 'smtp' },
    { href: '/assets', label: 'Assets', icon: 'assets' },
  ] },
  { heading: 'Audience', items: [
    { href: '/groups', label: 'Target groups', icon: 'groups' },
    { href: '/suppressions', label: 'Suppressions', icon: 'suppression' },
  ] },
];

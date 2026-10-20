import type { SVGProps } from 'react';
const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
export const Icon = {
  dashboard: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>,
  campaign: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M3 11l18-7-7 18-2.5-7.5L3 11z" /></svg>,
  template: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 8l9 5 9-5" /></svg>,
  landing: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 13h8M8 16h5" /></svg>,
  smtp: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M4 7h16v10H4zM4 7l8 6 8-6" /></svg>,
  groups: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><path d="M16 5.5a3 3 0 010 5.8M21 20c0-2.2-1.5-4-3.5-4.7" /></svg>,
  assets: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.8" /><path d="M21 15l-5-5L5 21" /></svg>,
  settings: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 00-.1-1.3l2-1.6-2-3.4-2.4 1a7 7 0 00-2.2-1.3L13.9 2h-3.8l-.4 2.4A7 7 0 007.5 5.7l-2.4-1-2 3.4 2 1.6A7 7 0 005 12c0 .4 0 .9.1 1.3l-2 1.6 2 3.4 2.4-1a7 7 0 002.2 1.3l.4 2.4h3.8l.4-2.4a7 7 0 002.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3z" /></svg>,
  menu: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M4 6h16M4 12h16M4 18h16" /></svg>,
  suppression: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></svg>,
  logout: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>,
};

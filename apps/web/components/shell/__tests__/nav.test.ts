import { describe, it, expect } from 'vitest';
import { navFor, isAvailableIn } from '../nav';

const hrefs = (mode: 'phishing' | 'email') => navFor(mode).flatMap((g) => g.items.map((i) => i.href));

describe('nav by console mode', () => {
  it('shows landing pages only in phishing mode', () => {
    expect(hrefs('phishing')).toContain('/landing-pages');
    expect(hrefs('email')).not.toContain('/landing-pages');
  });

  it('keeps shared sections in both modes', () => {
    for (const mode of ['phishing', 'email'] as const) {
      expect(hrefs(mode)).toEqual(expect.arrayContaining(['/', '/campaigns', '/templates', '/groups', '/settings']));
    }
  });

  it('knows which routes a mode can show, including nested ones', () => {
    expect(isAvailableIn('/landing-pages/abc', 'email')).toBe(false);
    expect(isAvailableIn('/landing-pages/abc', 'phishing')).toBe(true);
    expect(isAvailableIn('/campaigns/new', 'email')).toBe(true);
    expect(isAvailableIn('/', 'email')).toBe(true);
  });
});

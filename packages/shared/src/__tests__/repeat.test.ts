import { describe, it, expect } from 'vitest';
import { advance } from '../repeat.js';

describe('advance', () => {
  it('adds the right interval', () => {
    const base = new Date('2026-01-10T10:00:00.000Z');
    expect(advance(base, 'DAILY').toISOString()).toContain('2026-01-11');
    expect(advance(base, 'WEEKLY').toISOString()).toContain('2026-01-17');
    expect(advance(base, 'MONTHLY').toISOString()).toContain('2026-02-10');
    expect(advance(base, 'NONE').getTime()).toBe(base.getTime());
  });
});

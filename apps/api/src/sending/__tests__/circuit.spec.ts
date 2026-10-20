import { describe, it, expect } from 'vitest';
import { Circuit } from '../circuit';

describe('Circuit', () => {
  it('opens a host after the failure threshold and leaves other hosts closed', () => {
    const c = new Circuit({ threshold: 3, cooldownMs: 10_000 });
    const now = 1_000;
    for (let i = 0; i < 3; i++) c.recordFailure('a.host', now);
    expect(c.canSend('a.host', now + 1)).toBe(false);
    expect(c.canSend('b.host', now + 1)).toBe(true);
  });

  it('closes again after the cooldown and on success', () => {
    const c = new Circuit({ threshold: 2, cooldownMs: 5_000 });
    c.recordFailure('h', 0);
    c.recordFailure('h', 0);
    expect(c.canSend('h', 1)).toBe(false);
    expect(c.canSend('h', 6_000)).toBe(true);
    c.recordFailure('h', 10_000);
    c.recordSuccess('h');
    expect(c.canSend('h', 10_001)).toBe(true);
  });
});

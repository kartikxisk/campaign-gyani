import { describe, it, expect } from 'vitest';
import { successRate } from '../metrics.js';

describe('successRate', () => {
  it('is 0 when nothing was sent', () => {
    expect(successRate(0, 5, 5, 0)).toBe(0);
  });
  it('uses the greater of opened/submitted, minus reported', () => {
    expect(successRate(10, 6, 3, 1)).toBe(50); // (6-1)/10
    expect(successRate(10, 2, 8, 0)).toBe(80); // (8-0)/10
  });
  it('never goes below 0 or above 100', () => {
    expect(successRate(10, 1, 1, 5)).toBe(0);
    expect(successRate(10, 20, 20, 0)).toBe(100);
  });
});

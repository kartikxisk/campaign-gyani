import { describe, it, expect } from 'vitest';
import { parseViewMode, readViewModeCookie, VIEW_MODE_COOKIE } from '../view-mode';

describe('view mode cookie', () => {
  it('defaults to phishing for missing or unknown values', () => {
    expect(parseViewMode(undefined)).toBe('phishing');
    expect(parseViewMode('')).toBe('phishing');
    expect(parseViewMode('nonsense')).toBe('phishing');
  });

  it('accepts the two known modes', () => {
    expect(parseViewMode('phishing')).toBe('phishing');
    expect(parseViewMode('email')).toBe('email');
  });

  it('reads the mode out of a document.cookie string', () => {
    expect(readViewModeCookie(`theme=dark; ${VIEW_MODE_COOKIE}=email; x=1`)).toBe('email');
    expect(readViewModeCookie('theme=dark')).toBe('phishing');
    expect(readViewModeCookie('')).toBe('phishing');
  });
});

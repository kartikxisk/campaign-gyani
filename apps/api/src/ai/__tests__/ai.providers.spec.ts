import { describe, it, expect } from 'vitest';
import { AI_PROVIDERS, getProvider, isProviderId, extractTemplate } from '../ai.providers';

describe('AI provider registry', () => {
  it('exposes the three providers with a default model', () => {
    expect(AI_PROVIDERS.map((p) => p.id).sort()).toEqual(['anthropic', 'google', 'openai']);
    for (const p of AI_PROVIDERS) {
      expect(p.defaultModel).toBeTruthy();
      expect(p.models.length).toBeGreaterThan(0);
    }
  });

  it('defaults Claude to the current Opus', () => {
    expect(getProvider('anthropic').defaultModel).toBe('claude-opus-5-5');
  });

  it('narrows provider ids', () => {
    expect(isProviderId('anthropic')).toBe(true);
    expect(isProviderId('grok')).toBe(false);
  });
});

describe('extractTemplate', () => {
  it('parses a bare JSON object', () => {
    expect(extractTemplate('{"subject":"Hi","html":"<p>x</p>","text":"x"}')).toEqual({ subject: 'Hi', html: '<p>x</p>', text: 'x' });
  });

  it('parses JSON wrapped in a ```json fence and surrounding prose', () => {
    const raw = 'Sure!\n```json\n{"subject":"Reset","html":"<p>click {{.URL}}</p>","text":"click"}\n```\nDone.';
    expect(extractTemplate(raw)).toEqual({ subject: 'Reset', html: '<p>click {{.URL}}</p>', text: 'click' });
  });

  it('handles braces inside strings', () => {
    const raw = '{"subject":"Hello {name}","html":"<p>{{.FirstName}}</p>","text":""}';
    expect(extractTemplate(raw).subject).toBe('Hello {name}');
  });

  it('throws when there is no usable object', () => {
    expect(() => extractTemplate('no json here')).toThrow();
    expect(() => extractTemplate('{"text":"only"}')).toThrow();
  });
});

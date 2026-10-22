import { describe, it, expect } from 'vitest';
import { RenderService } from '../render.service';

const svc = new RenderService({ SESSION_SECRET: 'test-secret-session-key-123456' } as any);
const BASE = 'https://pub.example.com';
const ctx = { FirstName: 'Ada', LastName: 'Lovelace', Email: 'ada@corp.com', Position: 'Engineer', URL: 'https://pub.example.com/api/t/c/RID1', ExternalURL: 'https://evil.test/x' };

describe('renderTemplate', () => {
  it('fills all six supported tokens from context', () => {
    const out = svc.renderTemplate('{{.FirstName}} {{.LastName}} {{.Email}} {{.Position}} {{.URL}} {{.ExternalURL}}', ctx);
    expect(out).toBe('Ada Lovelace ada@corp.com Engineer https://pub.example.com/api/t/c/RID1 https://evil.test/x');
  });
  it('renders an unknown token as empty', () => {
    expect(svc.renderTemplate('Hi {{.Unknown}}!', ctx)).toBe('Hi !');
  });
  it('renders the unsupported Company token as empty', () => {
    expect(svc.renderTemplate('[{{.Company}}]', ctx)).toBe('[]');
  });
  it('leaves a malformed/unclosed token as literal text', () => {
    expect(svc.renderTemplate('x {{.FirstName y', ctx)).toBe('x {{.FirstName y');
  });
  it('HTML-escapes interpolated values to prevent XSS', () => {
    const out = svc.renderTemplate('Hi {{.FirstName}}', { FirstName: '<script>alert(1)</script>' } as never);
    expect(out).toBe('Hi &lt;script&gt;alert(1)&lt;/script&gt;');
  });
  it('blanks a javascript: URL in a URL-typed token', () => {
    const out = svc.renderTemplate('{{.ExternalURL}}', { ExternalURL: 'javascript:alert(1)' } as never);
    expect(out).toBe('');
  });

  it('renders a missing context field as empty', () => {
    expect(svc.renderTemplate('Hi {{.FirstName}}', {})).toBe('Hi ');
  });
});

describe('rewriteLinks', () => {
  it('points anchors at the tracked click URL while keeping the anchor text', () => {
    const out = svc.rewriteLinks(BASE, '<a href="https://bank.test/login">Sign in</a>', 'RID1');
    expect(out).toContain('https://pub.example.com/api/t/c/RID1');
    expect(out).toContain('>Sign in</a>');
    expect(out).toContain(encodeURIComponent('https://bank.test/login'));
  });
});

describe('rewriteLinks signature', () => {
  it('appends a signature parameter to the tracked link', () => {
    const out = svc.rewriteLinks(BASE, '<a href="https://bank.test/login">go</a>', 'RID1');
    expect(out).toMatch(/[?&]s=[a-f0-9]{8,}/);
  });
});

describe('injectPixel', () => {
  it('appends exactly one tracking pixel pointing at the open endpoint', () => {
    const out = svc.injectPixel(BASE, '<html><body><p>hi</p></body></html>', 'RID1');
    const matches = out.match(/\/api\/t\/o\/RID1/g) ?? [];
    expect(matches).toHaveLength(1);
    expect(out).toContain('<img');
  });
});

describe('clickUrl', () => {
  it('builds the landing click URL for the rid', () => {
    expect(svc.clickUrl(BASE, 'RID1')).toBe('https://pub.example.com/api/t/c/RID1');
  });
});

import { describe, it, expect } from 'vitest';
import { ImportService } from '../import.service';
import { assertPublicUrl, UnsafeUrlError } from '../ssrf-guard';

describe('assertPublicUrl', () => {
  it('rejects loopback, private, metadata and file/non-http URLs', async () => {
    for (const u of ['http://localhost/x', 'http://127.0.0.1/', 'http://169.254.169.254/latest/meta-data', 'http://10.0.0.5/', 'file:///etc/passwd', 'ftp://example.com/']) {
      await expect(assertPublicUrl(u)).rejects.toBeInstanceOf(UnsafeUrlError);
    }
  });
});

describe('ImportService.importEmail', () => {
  const svc = new ImportService();
  const raw = ['From: IT <it@corp.com>', 'To: a@b.com', 'Subject: Reset your password', 'Content-Type: text/html', '', '<p>Click <a href="https://real.bank/login">here</a></p>', ''].join('\r\n');

  it('parses subject and html from a raw message', async () => {
    const res = await svc.importEmail(raw, false);
    expect(res.subject).toBe('Reset your password');
    expect(res.html).toContain('<a href="https://real.bank/login">');
  });

  it('rewrites links to the URL token when convertLinks is set', async () => {
    const res = await svc.importEmail(raw, true);
    expect(res.html).toContain('{{.URL}}');
    expect(res.html).not.toContain('https://real.bank/login');
  });
});

describe('ImportService.importSite', () => {
  it('rejects a private URL', async () => {
    const svc = new ImportService();
    await expect(svc.importSite('http://127.0.0.1/')).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it('fetches and strips scripts from a public page (stubbed fetch)', async () => {
    const stub = async () => new Response('<html><body><h1>Hi</h1><script>evil()</script></body></html>', { status: 200 });
    const svc = new ImportService(stub as unknown as typeof fetch, async () => undefined);
    const res = await svc.importSite('https://example.com');
    expect(res.html).toContain('<h1>Hi</h1>');
    expect(res.html).not.toContain('<script>');
  });
});

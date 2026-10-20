import { describe, it, expect } from 'vitest';
import { isPublicUnicast, assertSmtpTarget, SmtpTargetError, ALLOWED_SMTP_PORTS } from '../../mail/smtp-guard';

describe('smtp target guard', () => {
  it('classifies private, loopback, link-local and metadata as non-public', () => {
    for (const ip of ['127.0.0.1', '10.0.0.1', '192.168.1.1', '172.16.0.1', '169.254.169.254', '100.64.0.1', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1']) {
      expect(isPublicUnicast(ip)).toBe(false);
    }
  });
  it('classifies public addresses as public', () => {
    expect(isPublicUnicast('8.8.8.8')).toBe(true);
    expect(isPublicUnicast('2606:4700:4700::1111')).toBe(true);
  });
  it('rejects non-SMTP ports', async () => {
    await expect(assertSmtpTarget('8.8.8.8', 8080)).rejects.toBeInstanceOf(SmtpTargetError);
  });
  it('rejects a literal private IP host', async () => {
    await expect(assertSmtpTarget('127.0.0.1', 587)).rejects.toBeInstanceOf(SmtpTargetError);
  });
  it('pins a literal public IP', async () => {
    const t = await assertSmtpTarget('8.8.8.8', 587);
    expect(t.address).toBe('8.8.8.8');
    expect(ALLOWED_SMTP_PORTS.has(587)).toBe(true);
  });
});

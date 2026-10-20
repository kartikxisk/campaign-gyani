import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  sendingProfileSchema,
  emailTemplateSchema,
  landingPageSchema,
  targetSchema,
  targetGroupSchema,
  campaignCreateSchema,
} from '../index.js';

describe('loginSchema', () => {
  it('accepts an email + password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'secret12' }).success).toBe(true);
  });
  it('rejects a bad email', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'secret12' }).success).toBe(false);
  });
});

describe('sendingProfileSchema', () => {
  const valid = {
    name: 'Primary',
    provider: 'custom',
    fromAddress: 'noreply@example.com',
    host: 'smtp.example.com',
    port: 587,
    username: 'u',
    password: 'p',
    rateLimit: 10,
    maxConnections: 5,
    maxMessages: 100,
    pool: true,
    ignoreCertErrors: false,
    headers: [{ key: 'X-A', value: '1' }],
  };
  it('accepts a complete profile', () => {
    expect(sendingProfileSchema.safeParse(valid).success).toBe(true);
  });
  it('rejects a non-positive rate limit', () => {
    expect(sendingProfileSchema.safeParse({ ...valid, rateLimit: 0 }).success).toBe(false);
  });
  it('rejects an invalid fromAddress', () => {
    expect(sendingProfileSchema.safeParse({ ...valid, fromAddress: 'x' }).success).toBe(false);
  });
});

describe('emailTemplateSchema', () => {
  const valid = { name: 'T', envelopeSender: 'A <a@b.com>', subject: 'Hi', textBody: 't', htmlBody: '<p>t</p>' };
  it('accepts a minimal template', () => {
    expect(emailTemplateSchema.safeParse(valid).success).toBe(true);
  });
  it('rejects a missing subject', () => {
    const { subject, ...rest } = valid;
    expect(emailTemplateSchema.safeParse(rest).success).toBe(false);
  });
  it('rejects a malformed externalUrl', () => {
    expect(emailTemplateSchema.safeParse({ ...valid, externalUrl: 'ftp:/x' }).success).toBe(false);
  });
});

describe('landingPageSchema', () => {
  const valid = { name: 'L', html: '<form></form>', redirectUrl: 'https://example.com', captureData: true, capturePasswords: false };
  it('accepts a minimal landing page', () => {
    expect(landingPageSchema.safeParse(valid).success).toBe(true);
  });
  it('rejects a non-url redirect', () => {
    expect(landingPageSchema.safeParse({ ...valid, redirectUrl: 'not-a-url' }).success).toBe(false);
  });
});

describe('targetSchema', () => {
  it('accepts a target row', () => {
    expect(targetSchema.safeParse({ email: 'a@b.com', firstName: 'A', lastName: 'B', position: 'Dev' }).success).toBe(true);
  });
  it('rejects a bad email', () => {
    expect(targetSchema.safeParse({ email: 'x', firstName: 'A', lastName: 'B', position: 'Dev' }).success).toBe(false);
  });
});

describe('targetGroupSchema', () => {
  it('accepts a named group', () => {
    expect(targetGroupSchema.safeParse({ name: 'Eng' }).success).toBe(true);
  });
  it('rejects an empty name', () => {
    expect(targetGroupSchema.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('campaignCreateSchema', () => {
  const base = {
    name: 'Q4',
    sendByDate: '2026-11-01T10:00:00.000Z',
    templateIds: ['t1'],
    pageId: 'p1',
    smtpId: 's1',
    groupIds: ['g1'],
  };
  it('accepts a single-template campaign without shuffle', () => {
    expect(campaignCreateSchema.safeParse(base).success).toBe(true);
  });
  it('requires at least one template', () => {
    expect(campaignCreateSchema.safeParse({ ...base, templateIds: [] }).success).toBe(false);
  });
  it('requires at least one group', () => {
    expect(campaignCreateSchema.safeParse({ ...base, groupIds: [] }).success).toBe(false);
  });
  it('rejects multiple templates when shuffle is left undefined', () => {
    expect(campaignCreateSchema.safeParse({ ...base, templateIds: ['t1', 't2'] }).success).toBe(false);
  });
  it('accepts multiple templates when shuffle is set explicitly', () => {
    expect(campaignCreateSchema.safeParse({ ...base, templateIds: ['t1', 't2'], shuffleTemplates: true }).success).toBe(true);
  });
});

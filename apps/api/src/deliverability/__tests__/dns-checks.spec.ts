import { describe, it, expect } from 'vitest';
import { parseSpf, parseDmarc, parseDkim, scoreSpam } from '../dns-checks';

describe('parseSpf', () => {
  it('passes on ~all / -all, fails on +all, warns on none, missing when absent', () => {
    expect(parseSpf([['v=spf1 include:_spf.google.com ~all']]).status).toBe('pass');
    expect(parseSpf([['v=spf1 -all']]).status).toBe('pass');
    expect(parseSpf([['v=spf1 +all']]).status).toBe('fail');
    expect(parseSpf([['v=spf1 include:x']]).status).toBe('warn');
    expect(parseSpf([['something else']]).status).toBe('missing');
  });
  it('joins multi-chunk TXT answers', () => {
    expect(parseSpf([['v=spf1 inclu', 'de:a ~all']]).record).toBe('v=spf1 include:a ~all');
  });
});

describe('parseDmarc', () => {
  it('reads the policy', () => {
    expect(parseDmarc([['v=DMARC1; p=reject']])).toMatchObject({ status: 'pass', policy: 'reject' });
    expect(parseDmarc([['v=DMARC1; p=none; rua=mailto:x']])).toMatchObject({ status: 'warn', policy: 'none' });
    expect(parseDmarc([['nope']]).status).toBe('missing');
  });
});

describe('parseDkim', () => {
  it('skips without a selector, finds a key, flags revoked', () => {
    expect(parseDkim(null).status).toBe('skipped');
    expect(parseDkim([['v=DKIM1; k=rsa; p=MIGf...']], 'google').status).toBe('pass');
    expect(parseDkim([], 'google').status).toBe('missing');
    expect(parseDkim([['v=DKIM1; p=']], 'google').status).toBe('fail');
  });
});

describe('scoreSpam', () => {
  it('a clean plain+html email scores low', () => {
    const r = scoreSpam({ subject: 'Your monthly report', html: '<p>Hi {{.FirstName}}, see the report. {{.UnsubscribeURL}}</p>', text: 'Hi, see the report.' });
    expect(r.level).toBe('low');
  });
  it('html-only, all-caps, spam words, no unsubscribe scores higher', () => {
    const r = scoreSpam({ subject: 'WINNER ACT NOW', html: '<p>CLICK HERE for your FREE prize</p>', text: '' });
    expect(r.score).toBeGreaterThan(20);
    expect(r.reasons.length).toBeGreaterThan(0);
  });
});

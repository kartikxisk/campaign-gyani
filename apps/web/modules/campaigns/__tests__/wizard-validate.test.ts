import { describe, it, expect } from 'vitest';
import { validateStep, toCreatePayload, stepsFor, type WizardData } from '../wizard-validate';

const base: WizardData = { type: 'phishing', name: 'Q4', groupIds: ['g1'], templateIds: ['t1'], shuffleTemplates: null, pageId: 'p1', smtpId: 's1', sendByDate: '2026-11-01T10:00' };

describe('stepsFor', () => {
  it('drops the landing step in email mode', () => {
    expect(stepsFor(false).map((s) => s.key)).toContain('landing');
    expect(stepsFor(true).map((s) => s.key)).not.toContain('landing');
    expect(stepsFor(false)[0]!.key).toBe('type');
    expect(stepsFor(true)).toHaveLength(7);
  });
});

describe('validateStep', () => {
  it('requires a name', () => {
    expect(validateStep('name', { ...base, name: '  ' })).toMatch(/name/i);
    expect(validateStep('name', base)).toBeNull();
  });
  it('requires a group', () => {
    expect(validateStep('audience', { ...base, groupIds: [] })).toMatch(/group/i);
  });
  it('requires a shuffle decision for multiple templates', () => {
    expect(validateStep('email', { ...base, templateIds: ['t1', 't2'], shuffleTemplates: null })).toMatch(/shuffle/i);
    expect(validateStep('email', { ...base, templateIds: ['t1', 't2'], shuffleTemplates: true })).toBeNull();
  });
  it('requires landing, profile, schedule', () => {
    expect(validateStep('landing', { ...base, pageId: '' })).toMatch(/landing/i);
    expect(validateStep('profile', { ...base, smtpId: '' })).toMatch(/sending/i);
    expect(validateStep('schedule', { ...base, sendByDate: '' })).toMatch(/send/i);
  });
});

describe('toCreatePayload', () => {
  it('omits pageId in email mode, includes it in phishing mode', () => {
    expect(toCreatePayload({ ...base, type: 'email' }).pageId).toBeUndefined();
    expect(toCreatePayload({ ...base, type: 'phishing' }).pageId).toBe('p1');
  });
  it('sets shuffle only for multiple templates', () => {
    expect(toCreatePayload(base).shuffleTemplates).toBeUndefined();
    expect(toCreatePayload({ ...base, templateIds: ['a', 'b'], shuffleTemplates: true }).shuffleTemplates).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { validateStep, toCreatePayload, type WizardData } from '../wizard-validate';

const base: WizardData = { name: 'Q4', groupIds: ['g1'], templateIds: ['t1'], shuffleTemplates: null, pageId: 'p1', smtpId: 's1', sendByDate: '2026-11-01T10:00' };

describe('validateStep', () => {
  it('requires a name on step 0', () => {
    expect(validateStep(0, { ...base, name: '  ' })).toMatch(/name/i);
    expect(validateStep(0, base)).toBeNull();
  });
  it('requires a group on step 1', () => {
    expect(validateStep(1, { ...base, groupIds: [] })).toMatch(/group/i);
  });
  it('requires a shuffle decision when more than one template is chosen', () => {
    expect(validateStep(2, { ...base, templateIds: ['t1', 't2'], shuffleTemplates: null })).toMatch(/shuffle/i);
    expect(validateStep(2, { ...base, templateIds: ['t1', 't2'], shuffleTemplates: true })).toBeNull();
    expect(validateStep(2, { ...base, templateIds: ['t1'], shuffleTemplates: null })).toBeNull();
  });
  it('requires landing, profile and schedule on later steps', () => {
    expect(validateStep(3, { ...base, pageId: '' })).toMatch(/landing/i);
    expect(validateStep(4, { ...base, smtpId: '' })).toMatch(/sending/i);
    expect(validateStep(5, { ...base, sendByDate: '' })).toMatch(/send/i);
  });
});

describe('toCreatePayload', () => {
  it('omits shuffle for a single template and sets it for multiple', () => {
    expect(toCreatePayload(base).shuffleTemplates).toBeUndefined();
    expect(toCreatePayload({ ...base, templateIds: ['a', 'b'], shuffleTemplates: true }).shuffleTemplates).toBe(true);
  });
  it('converts the local datetime to ISO', () => {
    expect(toCreatePayload(base).sendByDate).toContain('T');
  });
});

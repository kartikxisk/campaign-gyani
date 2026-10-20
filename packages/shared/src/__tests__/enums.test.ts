import { describe, it, expect } from 'vitest';
import { CampaignStatus, ResultStatus } from '../enums.js';

describe('enums', () => {
  it('CampaignStatus has exactly the lifecycle values', () => {
    expect(Object.values(CampaignStatus).sort()).toEqual(
      ['COMPLETE', 'DRAFT', 'PAUSED', 'RUNNING', 'SCHEDULED'].sort(),
    );
  });

  it('ResultStatus has exactly the eight per-recipient values', () => {
    expect(Object.values(ResultStatus).sort()).toEqual(
      ['CLICKED', 'ERROR', 'OPENED', 'REPORTED', 'SCHEDULED', 'SENDING', 'SENT', 'SUBMITTED'].sort(),
    );
  });
});

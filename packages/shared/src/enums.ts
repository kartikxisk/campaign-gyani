export const CampaignStatus = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  RUNNING: 'RUNNING',
  COMPLETE: 'COMPLETE',
} as const;
export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];

export const ResultStatus = {
  SCHEDULED: 'SCHEDULED',
  SENDING: 'SENDING',
  SENT: 'SENT',
  OPENED: 'OPENED',
  CLICKED: 'CLICKED',
  SUBMITTED: 'SUBMITTED',
  REPORTED: 'REPORTED',
  ERROR: 'ERROR',
} as const;
export type ResultStatus = (typeof ResultStatus)[keyof typeof ResultStatus];

export const SENDING_PROVIDERS = ['gmail', 'o365', 'ses', 'sendgrid', 'mailgun', 'custom'] as const;
export type SendingProvider = (typeof SENDING_PROVIDERS)[number];

export const ASSET_KINDS = ['logo', 'image', 'attachment'] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export const EVENT_TYPES = ['SENT', 'OPENED', 'CLICKED', 'SUBMITTED', 'REPORTED', 'ERROR'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

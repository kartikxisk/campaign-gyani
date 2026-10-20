import { z } from 'zod';
import { SENDING_PROVIDERS, ASSET_KINDS } from '../enums.js';

const nonEmpty = (label: string) => z.string().trim().min(1, `${label} is required`);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const sendingProfileSchema = z.object({
  name: nonEmpty('Name'),
  provider: z.enum(SENDING_PROVIDERS),
  fromAddress: z.string().email(),
  host: nonEmpty('Host'),
  port: z.number().int().positive().max(65535),
  username: z.string(),
  password: z.string(),
  rateLimit: z.number().int().positive(),
  maxConnections: z.number().int().positive(),
  maxMessages: z.number().int().positive(),
  pool: z.boolean(),
  ignoreCertErrors: z.boolean(),
  headers: z.array(z.object({ key: z.string(), value: z.string() })).default([]),
});
export type SendingProfileDto = z.infer<typeof sendingProfileSchema>;

const attachmentRef = z.object({
  assetId: z.string(),
  filename: z.string(),
});

export const emailTemplateSchema = z.object({
  name: nonEmpty('Name'),
  envelopeSender: nonEmpty('Envelope sender'),
  subject: nonEmpty('Subject'),
  textBody: z.string().default(''),
  htmlBody: z.string().default(''),
  externalUrl: z
    .string()
    .refine((v) => /^https?:\/\//.test(v), 'Must be an http(s) URL')
    .optional()
    .or(z.literal('')),
  attachments: z.array(attachmentRef).default([]),
});
export type EmailTemplateDto = z.infer<typeof emailTemplateSchema>;

export const landingPageSchema = z.object({
  name: nonEmpty('Name'),
  html: nonEmpty('HTML'),
  redirectUrl: z.string().url(),
  captureData: z.boolean().default(false),
  capturePasswords: z.boolean().default(false),
});
export type LandingPageDto = z.infer<typeof landingPageSchema>;

export const targetSchema = z.object({
  email: z.string().email(),
  firstName: z.string().default(''),
  lastName: z.string().default(''),
  position: z.string().default(''),
});
export type TargetDto = z.infer<typeof targetSchema>;

export const targetGroupSchema = z.object({
  name: nonEmpty('Name'),
});
export type TargetGroupDto = z.infer<typeof targetGroupSchema>;

export const campaignCreateSchema = z
  .object({
    name: nonEmpty('Name'),
    sendByDate: z.string().datetime(),
    templateIds: z.array(z.string()).min(1, 'Select at least one template'),
    pageId: z.string().optional(),
    smtpId: nonEmpty('Sending profile'),
    groupIds: z.array(z.string()).min(1, 'Select at least one group'),
    shuffleTemplates: z.boolean().optional(),
    recommendedTrainings: z
      .object({
        lowrisk: z.array(z.string()).default([]),
        mediumrisk: z.array(z.string()).default([]),
        highrisk: z.array(z.string()).default([]),
      })
      .optional(),
  })
  .refine((v) => v.templateIds.length <= 1 || v.shuffleTemplates !== undefined, {
    message: 'Choose whether to shuffle when more than one template is selected',
    path: ['shuffleTemplates'],
  });
export type CampaignCreateDto = z.infer<typeof campaignCreateSchema>;

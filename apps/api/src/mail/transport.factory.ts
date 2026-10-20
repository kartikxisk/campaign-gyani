import nodemailer, { type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { decryptSecret } from '../auth/crypto.util';

export interface ProviderPreset {
  host?: string;
  port: number;
  rateLimit: number;
  maxConnections: number;
  maxMessages: number;
}

export const PROVIDER_PRESETS: Record<string, ProviderPreset> = {
  gmail: { host: 'smtp.gmail.com', port: 587, rateLimit: 5, maxConnections: 5, maxMessages: 100 },
  o365: { host: 'smtp.office365.com', port: 587, rateLimit: 3, maxConnections: 3, maxMessages: 100 },
  ses: { port: 587, rateLimit: 14, maxConnections: 10, maxMessages: 100 },
  sendgrid: { host: 'smtp.sendgrid.net', port: 587, rateLimit: 50, maxConnections: 10, maxMessages: 100 },
  mailgun: { host: 'smtp.mailgun.org', port: 587, rateLimit: 50, maxConnections: 10, maxMessages: 100 },
  custom: { port: 587, rateLimit: 10, maxConnections: 5, maxMessages: 100 },
};

export interface TransportProfile {
  host: string;
  port: number;
  username: string;
  passwordEnc: string;
  pool: boolean;
  maxConnections: number;
  maxMessages: number;
  rateLimit: number;
  ignoreCertErrors: boolean;
}

export interface TransportPin {
  connectHost?: string;
  servername?: string;
}

export function buildTransport(
  profile: TransportProfile,
  encKey: string,
  overrideTimeoutMs?: number,
  pin?: TransportPin,
): Transporter {
  const options: SMTPTransport.Options & {
    pool?: boolean;
    maxConnections?: number;
    maxMessages?: number;
    rateLimit?: number;
    rateDelta?: number;
  } = {
    host: pin?.connectHost ?? profile.host,
    port: profile.port,
    secure: profile.port === 465,
    requireTLS: profile.port !== 465,
    pool: profile.pool,
    maxConnections: profile.maxConnections,
    maxMessages: profile.maxMessages,
    rateLimit: profile.rateLimit,
    rateDelta: 1000,
    auth: { user: profile.username, pass: decryptSecret(profile.passwordEnc, encKey) },
    tls: { rejectUnauthorized: !profile.ignoreCertErrors, ...(pin?.servername ? { servername: pin.servername } : {}) },
    ...(overrideTimeoutMs ? { connectionTimeout: overrideTimeoutMs, greetingTimeout: overrideTimeoutMs } : {}),
  };
  return nodemailer.createTransport(options);
}

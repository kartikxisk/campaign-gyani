import { Inject, Injectable } from '@nestjs/common';
import type { SendingProfile } from '@prisma/client';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';
import { assertSmtpTarget } from '../mail/smtp-guard';
import { buildTransport } from '../mail/transport.factory';

export interface OutgoingMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; path: string }[];
}

export interface Mailer {
  send(profile: SendingProfile, message: OutgoingMessage): Promise<{ messageId: string }>;
}

export const MAILER = Symbol('MAILER');

@Injectable()
export class NodemailerMailer implements Mailer {
  constructor(@Inject(ENV) private readonly env: Pick<Env, 'SMTP_ENC_KEY'>) {}

  async send(profile: SendingProfile, message: OutgoingMessage): Promise<{ messageId: string }> {
    const target = await assertSmtpTarget(profile.host, profile.port);
    const transporter = buildTransport(profile, this.env.SMTP_ENC_KEY, 15_000, {
      connectHost: target.address,
      servername: target.servername,
    });
    try {
      const info = await transporter.sendMail({ ...message, attachments: message.attachments });
      return { messageId: info.messageId };
    } finally {
      transporter.close();
    }
  }
}

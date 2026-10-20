import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { ResultStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SuppressionService } from '../suppression/suppression.service';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';
import { safeStringEqual } from '../auth/crypto.util';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly suppression: SuppressionService,
    @Inject(ENV) private readonly env: Pick<Env, 'SESSION_SECRET' | 'PUBLIC_BASE_URL'>,
  ) {}

  private readonly logger = new Logger(WebhooksService.name);

  /** A dedicated, rotatable webhook secret stored in the DB (not derived from SESSION_SECRET). */
  async secret(): Promise<string> {
    const row = await this.prisma.appSetting.findUnique({ where: { id: 'app' } });
    if (row?.webhookSecret) return row.webhookSecret;
    const generated = randomBytes(24).toString('hex');
    // Ensure the singleton exists, then set the secret only if it is still null.
    await this.prisma.appSetting.upsert({ where: { id: 'app' }, create: { id: 'app', webhookSecret: generated }, update: {} });
    await this.prisma.appSetting.updateMany({ where: { id: 'app', webhookSecret: null }, data: { webhookSecret: generated } });
    const after = await this.prisma.appSetting.findUniqueOrThrow({ where: { id: 'app' } });
    return after.webhookSecret as string;
  }

  async rotate(): Promise<string> {
    const generated = randomBytes(24).toString('hex');
    await this.prisma.appSetting.upsert({ where: { id: 'app' }, create: { id: 'app', webhookSecret: generated }, update: { webhookSecret: generated } });
    return this.url(generated);
  }

  url(secret: string): string {
    return `${this.env.PUBLIC_BASE_URL}/api/webhooks/suppress?token=${secret}`;
  }

  async verify(token: string | undefined): Promise<boolean> {
    if (!token) return false;
    return safeStringEqual(token, await this.secret());
  }

  /** Suppresses an address (bounce/complaint/unsubscribe) and fails its still-pending sends. */
  async suppress(email: string, reason = 'bounce'): Promise<{ suppressed: string }> {
    const normalized = email.trim().toLowerCase();
    const cleanReason = reason.replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'bounce';
    this.logger.warn(`Webhook suppression: ${maskEmail(normalized)} (${cleanReason})`);
    await this.suppression.add(normalized, cleanReason);
    await this.prisma.campaignResult.updateMany({
      where: { email: { equals: normalized, mode: 'insensitive' }, status: { in: [ResultStatus.SCHEDULED, ResultStatus.SENDING] } },
      data: { status: ResultStatus.ERROR, error: `Suppressed (${reason})` },
    });
    return { suppressed: normalized };
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const head = (local ?? '').slice(0, 1);
  return `${head}***@${domain}`;
}

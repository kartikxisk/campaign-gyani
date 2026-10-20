import { Inject, Injectable } from '@nestjs/common';
import { ResultStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SuppressionService } from '../suppression/suppression.service';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';
import { hmacSign, safeStringEqual } from '../auth/crypto.util';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly suppression: SuppressionService,
    @Inject(ENV) private readonly env: Pick<Env, 'SESSION_SECRET' | 'PUBLIC_BASE_URL'>,
  ) {}

  token(): string {
    return hmacSign('webhook-suppress-v1', this.env.SESSION_SECRET);
  }

  url(): string {
    return `${this.env.PUBLIC_BASE_URL}/api/webhooks/suppress?token=${this.token()}`;
  }

  verify(token: string | undefined): boolean {
    return Boolean(token) && safeStringEqual(token as string, this.token());
  }

  /** Suppresses an address (bounce/complaint/unsubscribe) and fails its still-pending sends. */
  async suppress(email: string, reason = 'bounce'): Promise<{ suppressed: string }> {
    const normalized = email.trim().toLowerCase();
    await this.suppression.add(normalized, reason);
    await this.prisma.campaignResult.updateMany({
      where: { email: { equals: normalized, mode: 'insensitive' }, status: { in: [ResultStatus.SCHEDULED, ResultStatus.SENDING] } },
      data: { status: ResultStatus.ERROR, error: `Suppressed (${reason})` },
    });
    return { suppressed: normalized };
  }
}

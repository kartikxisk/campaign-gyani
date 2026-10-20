import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ResultStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RenderService } from '../render/render.service';
import { SettingsService } from '../settings/settings.service';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';

const RANK: Record<string, number> = {
  SCHEDULED: 0, SENDING: 1, SENT: 2, OPENED: 3, CLICKED: 4, SUBMITTED: 5, ERROR: -1, REPORTED: 2,
};

export interface ClientMeta {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly render: RenderService,
    private readonly settings: SettingsService,
    @Inject(ENV) private readonly env: Pick<Env, 'PUBLIC_BASE_URL'>,
  ) {}

  private async bump(resultId: string, current: string, target: ResultStatus): Promise<void> {
    if ((RANK[target] ?? 0) > (RANK[current] ?? 0)) {
      await this.prisma.campaignResult.update({ where: { id: resultId }, data: { status: target } });
    }
  }

  /** Open never leaks rid validity: it always returns a pixel; only a real rid records an event. */
  async recordOpen(rid: string, meta: ClientMeta): Promise<void> {
    const result = await this.prisma.campaignResult.findUnique({ where: { rid } });
    if (!result) return;
    await this.prisma.campaignEvent.create({ data: { resultId: result.id, type: 'OPENED', ip: meta.ip, userAgent: meta.userAgent } });
    await this.bump(result.id, result.status, ResultStatus.OPENED);
  }

  async recordClick(rid: string, meta: ClientMeta, originalUrl?: string): Promise<string> {
    const result = await this.prisma.campaignResult.findUnique({ where: { rid } });
    if (!result) throw new NotFoundException();
    await this.prisma.campaignEvent.create({ data: { resultId: result.id, type: 'CLICKED', ip: meta.ip, userAgent: meta.userAgent } });
    await this.bump(result.id, result.status, ResultStatus.CLICKED);
    // Email mode has no landing page: send the recipient to the real URL the
    // author linked. Phishing mode routes to the hosted landing page.
    const mode = await this.settings.getMode();
    if (mode === 'email') {
      if (originalUrl && /^https?:\/\//i.test(originalUrl)) return originalUrl;
      return this.env.PUBLIC_BASE_URL;
    }
    return `${this.env.PUBLIC_BASE_URL}/v/${rid}`;
  }

  async getLandingView(rid: string): Promise<{ html: string }> {
    if ((await this.settings.getMode()) === 'email') throw new NotFoundException();
    const result = await this.prisma.campaignResult.findUnique({ where: { rid }, include: { campaign: { include: { landingPage: true } } } });
    if (!result || !result.campaign.landingPage) throw new NotFoundException();
    const ctx = { FirstName: result.firstName, LastName: result.lastName, Email: result.email, Position: result.position };
    const filled = this.render.renderTemplate(result.campaign.landingPage.html, ctx);
    const action = `${this.env.PUBLIC_BASE_URL}/api/t/s/${rid}`;
    // Point every form at the submit endpoint.
    const html = filled.replace(/<form\b([^>]*)>/gi, (m, attrs: string) => {
      const cleaned = attrs.replace(/\saction=(["']).*?\1/gi, '').replace(/\smethod=(["']).*?\1/gi, '');
      return `<form${cleaned} action="${action}" method="POST">`;
    });
    return { html };
  }

  async recordSubmit(rid: string, body: Record<string, unknown>, meta: ClientMeta): Promise<string> {
    if ((await this.settings.getMode()) === 'email') throw new NotFoundException();
    const result = await this.prisma.campaignResult.findUnique({ where: { rid }, include: { campaign: { include: { landingPage: true } } } });
    if (!result || !result.campaign.landingPage) throw new NotFoundException();
    const lp = result.campaign.landingPage;

    let captured: Record<string, unknown> | undefined;
    if (lp.captureData) {
      captured = {};
      for (const [k, v] of Object.entries(body)) {
        if (k === 'rid') continue;
        const looksLikePassword = /pass|pwd|secret/i.test(k);
        if (looksLikePassword && !lp.capturePasswords) continue;
        captured[k] = v;
      }
    }
    await this.prisma.campaignEvent.create({
      data: { resultId: result.id, type: 'SUBMITTED', ip: meta.ip, userAgent: meta.userAgent, payload: (captured ?? {}) as Prisma.InputJsonObject },
    });
    await this.bump(result.id, result.status, ResultStatus.SUBMITTED);
    return lp.redirectUrl;
  }

  async recordReport(rid: string, meta: ClientMeta): Promise<void> {
    if ((await this.settings.getMode()) === 'email') throw new NotFoundException();
    const result = await this.prisma.campaignResult.findUnique({ where: { rid } });
    if (!result) throw new NotFoundException();
    await this.prisma.campaignEvent.create({ data: { resultId: result.id, type: 'REPORTED', ip: meta.ip, userAgent: meta.userAgent } });
    await this.prisma.campaignResult.update({ where: { id: result.id }, data: { reported: true } });
  }
}

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ResultStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RenderService } from '../render/render.service';
import { Circuit, CircuitOpenError } from './circuit';
import { MAILER, type Mailer } from './mailer';
import { SettingsService } from '../settings/settings.service';
import { SuppressionService } from '../suppression/suppression.service';

const TERMINAL = new Set<string>([ResultStatus.SENT, ResultStatus.OPENED, ResultStatus.CLICKED, ResultStatus.SUBMITTED, ResultStatus.REPORTED]);

@Injectable()
export class SendProcessor {
  private readonly logger = new Logger(SendProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly render: RenderService,
    @Inject(MAILER) private readonly mailer: Mailer,
    private readonly circuit: Circuit,
    private readonly settings: SettingsService,
    private readonly suppression: SuppressionService,
  ) {}

  async deliver(resultId: string, attempt: number, maxAttempts: number): Promise<void> {
    const result = await this.prisma.campaignResult.findUnique({
      where: { id: resultId },
      include: { campaign: { include: { sendingProfile: true } } },
    });
    if (!result) return;
    if (TERMINAL.has(result.status)) return; // already progressed; don't resend
    // Don't send for a campaign that is completed, still draft, or deleted.
    if (result.campaign.status !== 'SCHEDULED' && result.campaign.status !== 'RUNNING') return;
    const mode = await this.settings.getMode();
    // Re-check suppression at send time: a recipient may have unsubscribed after
    // launch while this job sat in the queue.
    if (mode === 'email') {
      const suppressed = await this.suppression.suppressedSet([result.email]);
      if (suppressed.has(result.email.toLowerCase())) {
        await this.prisma.campaignResult.update({ where: { id: resultId }, data: { status: ResultStatus.ERROR, error: 'Recipient unsubscribed' } });
        return;
      }
    }
    const profile = result.campaign.sendingProfile;
    if (!profile) {
      await this.fail(resultId, 'No sending profile configured', attempt, maxAttempts);
      return;
    }

    if (!this.circuit.canSend(profile.host)) {
      throw new CircuitOpenError(`Host ${profile.host} is temporarily unavailable`);
    }

    const template = result.templateId
      ? await this.prisma.emailTemplate.findUnique({ where: { id: result.templateId } })
      : null;
    if (!template) {
      await this.fail(resultId, 'Template not found', attempt, maxAttempts);
      return;
    }

    await this.prisma.campaignResult.update({ where: { id: resultId }, data: { status: ResultStatus.SENDING } });

    const ctx = { FirstName: result.firstName, LastName: result.lastName, Email: result.email, Position: result.position, ExternalURL: template.externalUrl ?? '' };
    let html = this.render.renderForRecipient(template.htmlBody, ctx, result.rid);
    const subject = this.render.renderTemplate(template.subject, { ...ctx, URL: this.render.clickUrl(result.rid) });
    // Email mode requires an unsubscribe link; inject a footer if the author left one out.
    if (mode === 'email' && !html.includes('/api/t/u/')) {
      const url = this.render.unsubscribeUrl(result.rid);
      html += `<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e7ee;font:12px system-ui,sans-serif;color:#7a8798">Don't want these emails? <a href="${url}" style="color:#0891b2">Unsubscribe</a>.</div>`;
    }
    const attachments = await this.resolveAttachments(template.attachments);

    let info: { messageId: string };
    try {
      info = await this.mailer.send(profile, { from: template.envelopeSender, to: result.email, subject, html, attachments });
    } catch (err) {
      this.circuit.recordFailure(profile.host);
      const reason = (err as Error).message;
      if (attempt >= maxAttempts) {
        await this.fail(resultId, reason, attempt, maxAttempts);
        return;
      }
      this.logger.warn(`Send attempt ${attempt}/${maxAttempts} for ${resultId} failed: ${reason}`);
      throw err; // let the queue retry
    }
    // The message is already out. A failure here must NOT rethrow, or the queue
    // would resend to the same recipient; log and move on instead.
    this.circuit.recordSuccess(profile.host);
    try {
      await this.prisma.$transaction([
        this.prisma.campaignResult.update({ where: { id: resultId }, data: { status: ResultStatus.SENT, error: null } }),
        this.prisma.campaignEvent.create({ data: { resultId, type: 'SENT', payload: { messageId: info.messageId } } }),
      ]);
    } catch (dbErr) {
      this.logger.error(`Message sent for ${resultId} but recording SENT failed: ${(dbErr as Error).message}`);
    }
  }

  private async resolveAttachments(raw: unknown): Promise<{ filename: string; path: string }[]> {
    const list = Array.isArray(raw) ? (raw as { assetId?: string; filename?: string }[]) : [];
    const refs = list.filter((a) => a.assetId);
    if (refs.length === 0) return [];
    const assets = await this.prisma.asset.findMany({ where: { id: { in: refs.map((r) => r.assetId as string) } } });
    const byId = new Map(assets.map((a) => [a.id, a]));
    return refs
      .map((r) => {
        const asset = byId.get(r.assetId as string);
        return asset ? { filename: r.filename ?? asset.filename, path: asset.path } : null;
      })
      .filter((x): x is { filename: string; path: string } => x !== null);
  }

  private async fail(resultId: string, reason: string, attempt: number, maxAttempts: number): Promise<void> {
    this.logger.error(`Giving up on ${resultId} after ${attempt}/${maxAttempts}: ${reason}`);
    await this.prisma.campaignResult.update({ where: { id: resultId }, data: { status: ResultStatus.ERROR, error: reason } });
  }
}

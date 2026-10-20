import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { CampaignStatus, ResultStatus, type Campaign } from '@prisma/client';
import type { CampaignCreateDto } from '@cg/shared';
import { PrismaService } from '../prisma/prisma.service';
import { parseListQuery, type ListParamsInput, type ListResult } from '../common/list-query';
import { SEND_QUEUE, type SendQueue } from '../sending/send-queue.port';
import { SettingsService } from '../settings/settings.service';
import { SuppressionService } from '../suppression/suppression.service';

function token(bytes = 24): string {
  return randomBytes(bytes).toString('base64url');
}

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SEND_QUEUE) private readonly queue: SendQueue,
    private readonly settings: SettingsService,
    private readonly suppression: SuppressionService,
  ) {}

  async create(dto: CampaignCreateDto): Promise<Campaign> {
    const mode = await this.settings.getMode();
    if (mode !== 'email' && !dto.pageId) {
      throw new BadRequestException('A landing page is required for a phishing campaign');
    }
    return this.prisma.campaign.create({
      data: {
        name: dto.name,
        sendByDate: new Date(dto.sendByDate),
        landingPageId: dto.pageId ?? null,
        sendingProfileId: dto.smtpId,
        shuffleTemplates: dto.shuffleTemplates ?? false,
        status: CampaignStatus.DRAFT,
        templates: { create: dto.templateIds.map((templateId) => ({ templateId })) },
        groups: { create: dto.groupIds.map((groupId) => ({ groupId })) },
      },
    });
  }

  async list(params: ListParamsInput): Promise<ListResult<Campaign & { counts: Record<string, number> }>> {
    const { where, orderBy, skip, take, page, limit } = parseListQuery(params, {
      searchFields: ['name'],
      sortable: ['name', 'createdAt', 'launchedAt', 'sendByDate', 'status'],
      defaultSort: 'createdAt',
    });
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.campaign.findMany({ where, orderBy, skip, take }),
      this.prisma.campaign.count({ where }),
    ]);
    const withCounts = await Promise.all(rows.map(async (c) => ({ ...c, counts: await this.counts(c.id) })));
    return { rows: withCounts, total, page, limit };
  }

  async findOne(id: string): Promise<Campaign> {
    const c = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        templates: { include: { template: true } },
        landingPage: true,
        sendingProfile: {
          select: {
            id: true, name: true, provider: true, fromAddress: true, host: true, port: true,
            username: true, ignoreCertErrors: true, rateLimit: true, maxConnections: true,
            maxMessages: true, pool: true, headers: true, createdAt: true, updatedAt: true,
          },
        },
      },
    });
    if (!c) throw new NotFoundException('Campaign not found');
    return c;
  }

  // Event-based counts so the list matches the report (status is monotonic and
  // would hide OPENED once a result reaches CLICKED).
  async counts(campaignId: string): Promise<Record<string, number>> {
    const SENT_RANK = [ResultStatus.SENT, ResultStatus.OPENED, ResultStatus.CLICKED, ResultStatus.SUBMITTED];
    const [sent, opened, clicked, submitted, reported] = await this.prisma.$transaction([
      this.prisma.campaignResult.count({ where: { campaignId, status: { in: SENT_RANK } } }),
      this.prisma.campaignResult.count({ where: { campaignId, events: { some: { type: 'OPENED' } } } }),
      this.prisma.campaignResult.count({ where: { campaignId, events: { some: { type: 'CLICKED' } } } }),
      this.prisma.campaignResult.count({ where: { campaignId, events: { some: { type: 'SUBMITTED' } } } }),
      this.prisma.campaignResult.count({ where: { campaignId, reported: true } }),
    ]);
    return { SENT: sent, OPENED: opened, CLICKED: clicked, SUBMITTED: submitted, REPORTED: reported };
  }

  async launch(id: string): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id }, include: { templates: true } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new ConflictException('Campaign has already been launched');
    }
    const templateIds = campaign.templates.map((t) => t.templateId);
    if (templateIds.length === 0) throw new ConflictException('Campaign has no templates');

    // Snapshot every unique target of the selected groups into result rows.
    const now = Date.now();
    const sendAt = Math.max(campaign.sendByDate.getTime(), now);

    const result = await this.prisma.$transaction(async (tx) => {
      // Atomic guard: only one launch wins even under concurrent requests.
      const flip = await tx.campaign.updateMany({
        where: { id, status: CampaignStatus.DRAFT },
        data: { status: sendAt > now ? CampaignStatus.SCHEDULED : CampaignStatus.RUNNING, launchedAt: new Date() },
      });
      if (flip.count === 0) throw new ConflictException('Campaign has already been launched');
      const campaignGroups = await tx.campaignGroup.findMany({ where: { campaignId: id }, select: { groupId: true } });
      const groupIdList = campaignGroups.map((g) => g.groupId);
      const targets = await tx.target.findMany({ where: { groupId: { in: groupIdList } } });
      // De-dup targets by email across groups.
      const byEmail = new Map<string, (typeof targets)[number]>();
      for (const t of targets) if (!byEmail.has(t.email.toLowerCase())) byEmail.set(t.email.toLowerCase(), t);
      // Email mode honors the suppression list — unsubscribed recipients are skipped.
      if ((await this.settings.getMode()) === 'email') {
        const suppressed = await this.suppression.suppressedSet([...byEmail.keys()]);
        for (const email of suppressed) byEmail.delete(email);
      }

      const created = [];
      for (const t of byEmail.values()) {
        const templateId = campaign.shuffleTemplates
          ? templateIds[Math.floor(Math.random() * templateIds.length)]!
          : templateIds[0]!;
        const row = await tx.campaignResult.create({
          data: {
            campaignId: id,
            targetId: t.id,
            templateId,
            email: t.email,
            firstName: t.firstName,
            lastName: t.lastName,
            position: t.position,
            rid: token(16),
          },
        });
        created.push(row);
      }
      const updated = await tx.campaign.findUniqueOrThrow({ where: { id } });
      return { created, updated };
    });

    await this.queue.enqueue(result.created.map((r) => ({ resultId: r.id, sendAt })));
    return result.updated;
  }

  async complete(id: string): Promise<Campaign> {
    await this.findOne(id);
    return this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.COMPLETE, completedAt: new Date() },
    });
  }

  async setVisibility(id: string, enabled: boolean): Promise<{ publicEnabled: boolean; publicCode: string | null }> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    const publicCode = enabled ? (campaign.publicCode ?? token(18)) : null;
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { publicEnabled: enabled, publicCode },
    });
    return { publicEnabled: updated.publicEnabled, publicCode: updated.publicCode };
  }

  async results(id: string): Promise<unknown[]> {
    await this.findOne(id);
    return this.prisma.campaignResult.findMany({ where: { campaignId: id }, orderBy: { createdAt: 'asc' } });
  }

  async timeline(id: string): Promise<unknown[]> {
    await this.findOne(id);
    return this.prisma.campaignEvent.findMany({
      where: { result: { campaignId: id } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.campaign.delete({ where: { id } });
  }
}

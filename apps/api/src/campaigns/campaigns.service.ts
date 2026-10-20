import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { CampaignStatus, type Campaign } from '@prisma/client';
import type { CampaignCreateDto } from '@cg/shared';
import { PrismaService } from '../prisma/prisma.service';
import { parseListQuery, type ListParamsInput, type ListResult } from '../common/list-query';
import { SEND_QUEUE, type SendQueue } from '../sending/send-queue.port';

function token(bytes = 24): string {
  return randomBytes(bytes).toString('base64url');
}

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SEND_QUEUE) private readonly queue: SendQueue,
  ) {}

  async create(dto: CampaignCreateDto): Promise<Campaign> {
    return this.prisma.campaign.create({
      data: {
        name: dto.name,
        sendByDate: new Date(dto.sendByDate),
        landingPageId: dto.pageId,
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
      include: { templates: { include: { template: true } }, landingPage: true, sendingProfile: true },
    });
    if (!c) throw new NotFoundException('Campaign not found');
    return c;
  }

  async counts(campaignId: string): Promise<Record<string, number>> {
    const grouped = await this.prisma.campaignResult.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: { _all: true },
    });
    const out: Record<string, number> = {};
    for (const g of grouped) out[g.status] = g._count._all;
    return out;
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
      const campaignGroups = await tx.campaignGroup.findMany({ where: { campaignId: id }, select: { groupId: true } });
      const groupIdList = campaignGroups.map((g) => g.groupId);
      const targets = await tx.target.findMany({ where: { groupId: { in: groupIdList } } });
      // De-dup targets by email across groups.
      const byEmail = new Map<string, (typeof targets)[number]>();
      for (const t of targets) if (!byEmail.has(t.email.toLowerCase())) byEmail.set(t.email.toLowerCase(), t);

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
      const updated = await tx.campaign.update({
        where: { id },
        data: {
          status: sendAt > now ? CampaignStatus.SCHEDULED : CampaignStatus.RUNNING,
          launchedAt: new Date(),
        },
      });
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

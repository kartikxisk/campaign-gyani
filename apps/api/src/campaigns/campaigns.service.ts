import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { CampaignStatus, ResultStatus, type Campaign } from '@prisma/client';
import { advance, type Repeat, type CampaignCreateDto } from '@cg/shared';
import { PrismaService } from '../prisma/prisma.service';
import { parseListQuery, type ListParamsInput, type ListResult } from '../common/list-query';
import { SEND_QUEUE, type SendQueue } from '../sending/send-queue.port';
import { SuppressionService } from '../suppression/suppression.service';

function token(bytes = 24): string {
  return randomBytes(bytes).toString('base64url');
}

export type CampaignListParams = ListParamsInput & { type?: 'phishing' | 'email' };
export type ResultListParams = ListParamsInput & { status?: ResultStatus };
export type TimelineListParams = ListParamsInput & { resultId?: string };

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SEND_QUEUE) private readonly queue: SendQueue,
    private readonly suppression: SuppressionService,
  ) {}

  async create(dto: CampaignCreateDto): Promise<Campaign> {
    const type = dto.type ?? 'phishing';
    if (type !== 'email' && !dto.pageId) {
      throw new BadRequestException('A landing page is required for a phishing campaign');
    }
    return this.prisma.campaign.create({
      data: {
        name: dto.name,
        type,
        sendByDate: new Date(dto.sendByDate),
        landingPageId: dto.pageId ?? null,
        sendingProfileId: dto.smtpId,
        shuffleTemplates: dto.shuffleTemplates ?? false,
        repeat: dto.repeat ?? 'NONE',
        status: CampaignStatus.DRAFT,
        templates: { create: dto.templateIds.map((templateId) => ({ templateId })) },
        groups: { create: dto.groupIds.map((groupId) => ({ groupId })) },
      },
    });
  }

  async update(id: string, dto: CampaignCreateDto): Promise<Campaign> {
    const existing = await this.prisma.campaign.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Campaign not found');
    if (existing.status !== CampaignStatus.DRAFT) {
      throw new ConflictException('Only a draft campaign can be edited');
    }
    const type = dto.type ?? existing.type;
    if (type !== 'email' && !dto.pageId) {
      throw new BadRequestException('A landing page is required for a phishing campaign');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.campaignTemplate.deleteMany({ where: { campaignId: id } });
      await tx.campaignGroup.deleteMany({ where: { campaignId: id } });
      return tx.campaign.update({
        where: { id },
        data: {
          name: dto.name,
          type,
          sendByDate: new Date(dto.sendByDate),
          landingPageId: dto.pageId ?? null,
          sendingProfileId: dto.smtpId,
          shuffleTemplates: dto.shuffleTemplates ?? false,
          repeat: dto.repeat ?? 'NONE',
          templates: { create: dto.templateIds.map((templateId) => ({ templateId })) },
          groups: { create: dto.groupIds.map((groupId) => ({ groupId })) },
        },
      });
    });
  }

  async pause(id: string): Promise<Campaign> {
    const c = await this.prisma.campaign.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Campaign not found');
    if (c.status !== CampaignStatus.RUNNING && c.status !== CampaignStatus.SCHEDULED) {
      throw new ConflictException('Only a running or scheduled campaign can be paused');
    }
    return this.prisma.campaign.update({ where: { id }, data: { status: CampaignStatus.PAUSED } });
  }

  async resume(id: string): Promise<Campaign> {
    const c = await this.prisma.campaign.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Campaign not found');
    if (c.status !== CampaignStatus.PAUSED) throw new ConflictException('Only a paused campaign can be resumed');
    const status = c.sendByDate.getTime() > Date.now() ? CampaignStatus.SCHEDULED : CampaignStatus.RUNNING;
    return this.prisma.campaign.update({ where: { id }, data: { status } });
  }

  async list(params: CampaignListParams): Promise<ListResult<Campaign & { counts: Record<string, number> }>> {
    const { where, orderBy, skip, take, page, limit } = parseListQuery(params, {
      searchFields: ['name'],
      sortable: ['name', 'createdAt', 'launchedAt', 'sendByDate', 'status'],
      defaultSort: 'createdAt',
    });
    const scoped = (params.type === 'phishing' || params.type === 'email')
      ? { ...(where ?? {}), type: params.type }
      : where;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.campaign.findMany({ where: scoped, orderBy, skip, take }),
      this.prisma.campaign.count({ where: scoped }),
    ]);
    // One batched read for the whole page instead of 5 counts per campaign.
    const counts = await this.countsMany(rows.map((r) => r.id));
    const withCounts = rows.map((c) => ({ ...c, counts: counts.get(c.id)! }));
    return { rows: withCounts, total, page, limit };
  }

  async findOne(id: string): Promise<Campaign> {
    const c = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        templates: { include: { template: true } },
        groups: { select: { groupId: true } },
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

  // Same five metrics as counts(), but for many campaigns in five grouped
  // queries total (not five per campaign) — keeps the list off an N+1.
  async countsMany(ids: string[]): Promise<Map<string, Record<string, number>>> {
    const zero = () => ({ SENT: 0, OPENED: 0, CLICKED: 0, SUBMITTED: 0, REPORTED: 0 });
    const map = new Map(ids.map((id) => [id, zero()]));
    if (ids.length === 0) return map;
    const SENT_RANK = [ResultStatus.SENT, ResultStatus.OPENED, ResultStatus.CLICKED, ResultStatus.SUBMITTED];
    const byCampaign = (where: Record<string, unknown>) =>
      this.prisma.campaignResult.groupBy({ by: ['campaignId'], where: { campaignId: { in: ids }, ...where }, _count: { _all: true } });
    const [sent, opened, clicked, submitted, reported] = await this.prisma.$transaction([
      byCampaign({ status: { in: SENT_RANK } }),
      byCampaign({ events: { some: { type: 'OPENED' } } }),
      byCampaign({ events: { some: { type: 'CLICKED' } } }),
      byCampaign({ events: { some: { type: 'SUBMITTED' } } }),
      byCampaign({ reported: true }),
    ]);
    const apply = (rows: Array<{ campaignId: string; _count: { _all: number } }>, key: keyof ReturnType<typeof zero>) => {
      for (const r of rows) { const c = map.get(r.campaignId); if (c) c[key] = r._count._all; }
    };
    apply(sent, 'SENT'); apply(opened, 'OPENED'); apply(clicked, 'CLICKED'); apply(submitted, 'SUBMITTED'); apply(reported, 'REPORTED');
    return map;
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

    const CHUNK = 1000;
    const updated = await this.prisma.$transaction(
      async (tx) => {
        // Atomic guard: only one launch wins even under concurrent requests.
        const flip = await tx.campaign.updateMany({
          where: { id, status: CampaignStatus.DRAFT },
          data: { status: sendAt > now ? CampaignStatus.SCHEDULED : CampaignStatus.RUNNING, launchedAt: new Date() },
        });
        if (flip.count === 0) throw new ConflictException('Campaign has already been launched');
        const campaignGroups = await tx.campaignGroup.findMany({ where: { campaignId: id }, select: { groupId: true } });
        const groupIdList = campaignGroups.map((g) => g.groupId);
        const targets = await tx.target.findMany({
          where: { groupId: { in: groupIdList } },
          select: { id: true, email: true, firstName: true, lastName: true, position: true },
        });
        // De-dup targets by email across groups.
        const byEmail = new Map<string, (typeof targets)[number]>();
        for (const t of targets) if (!byEmail.has(t.email.toLowerCase())) byEmail.set(t.email.toLowerCase(), t);
        // Email mode honors the suppression list — unsubscribed recipients are skipped.
        if (campaign.type === 'email') {
          const suppressed = await this.suppression.suppressedSet([...byEmail.keys()]);
          for (const email of suppressed) byEmail.delete(email);
        }

        const rows = [...byEmail.values()].map((t) => ({
          campaignId: id,
          targetId: t.id,
          templateId: campaign.shuffleTemplates
            ? templateIds[Math.floor(Math.random() * templateIds.length)]!
            : templateIds[0]!,
          email: t.email,
          firstName: t.firstName,
          lastName: t.lastName,
          position: t.position,
          rid: token(16),
        }));
        // Bulk-insert in chunks (one statement each). A per-row create() loop here
        // scales the transaction's duration with recipient count.
        for (let i = 0; i < rows.length; i += CHUNK) {
          await tx.campaignResult.createMany({ data: rows.slice(i, i + CHUNK) });
        }
        return tx.campaign.findUniqueOrThrow({ where: { id } });
      },
      // A 100k-recipient launch inserts 100 batches; the default 5s interactive
      // timeout is far too short. Give the atomic snapshot room to complete.
      { timeout: 10 * 60_000, maxWait: 30_000 },
    );

    // Read ids and enqueue outside the transaction to keep it (and its held
    // connection) as short as possible; results belong only to this launch.
    const created = await this.prisma.campaignResult.findMany({ where: { campaignId: id }, select: { id: true } });
    for (let i = 0; i < created.length; i += CHUNK) {
      await this.queue.enqueue(created.slice(i, i + CHUNK).map((r) => ({ resultId: r.id, sendAt })));
    }
    if (campaign.repeat && campaign.repeat !== 'NONE' && !campaign.parentId) {
      const next = advance(new Date(sendAt), campaign.repeat as Repeat);
      await this.prisma.campaign.update({ where: { id }, data: { nextRunAt: next } });
    }
    return updated;
  }

  async complete(id: string): Promise<Campaign> {
    await this.findOne(id);
    return this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.COMPLETE, completedAt: new Date(), nextRunAt: null },
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

  async results(id: string, params: ResultListParams = {}): Promise<ListResult<unknown>> {
    await this.findOne(id);
    const { where, skip, take, page, limit } = parseListQuery(params, {
      searchFields: ['email', 'firstName', 'lastName'],
      sortable: ['createdAt', 'email', 'status'],
      defaultSort: 'createdAt',
      defaultLimit: 50,
    });
    // A single campaign can hold 100k result rows; never return them unbounded.
    const scoped = { campaignId: id, ...(params.status ? { status: params.status } : {}), ...(where ?? {}) };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.campaignResult.findMany({ where: scoped, orderBy: { createdAt: 'asc' }, skip, take }),
      this.prisma.campaignResult.count({ where: scoped }),
    ]);
    return { rows, total, page, limit };
  }

  async timeline(id: string, params: TimelineListParams = {}): Promise<ListResult<unknown>> {
    await this.findOne(id);
    const { skip, take, page, limit } = parseListQuery(params, {
      searchFields: [],
      sortable: ['createdAt'],
      defaultSort: 'createdAt',
      defaultLimit: 100,
    });
    // A 100k campaign can hold hundreds of thousands of events. The per-recipient
    // drawer passes resultId for a small, bounded slice; the full feed paginates.
    const where = { result: { campaignId: id }, ...(params.resultId ? { resultId: params.resultId } : {}) };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.campaignEvent.findMany({ where, orderBy: { createdAt: 'asc' }, skip, take }),
      this.prisma.campaignEvent.count({ where }),
    ]);
    return { rows, total, page, limit };
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.campaign.delete({ where: { id } });
  }
}

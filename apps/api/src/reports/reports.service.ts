import { Injectable, NotFoundException } from '@nestjs/common';
import { CampaignStatus, ResultStatus } from '@prisma/client';
import { successRate, openRate, clickRate } from '@cg/shared';
import { PrismaService } from '../prisma/prisma.service';

const SENT_RANK = [ResultStatus.SENT, ResultStatus.OPENED, ResultStatus.CLICKED, ResultStatus.SUBMITTED];

export interface CampaignCounts {
  sent: number;
  opened: number;
  clicked: number;
  submitted: number;
  reported: number;
  successRate: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async counts(campaignId: string): Promise<CampaignCounts> {
    const [sent, opened, clicked, submitted, reported] = await this.prisma.$transaction([
      this.prisma.campaignResult.count({ where: { campaignId, status: { in: SENT_RANK } } }),
      this.prisma.campaignResult.count({ where: { campaignId, events: { some: { type: 'OPENED' } } } }),
      this.prisma.campaignResult.count({ where: { campaignId, events: { some: { type: 'CLICKED' } } } }),
      this.prisma.campaignResult.count({ where: { campaignId, events: { some: { type: 'SUBMITTED' } } } }),
      this.prisma.campaignResult.count({ where: { campaignId, reported: true } }),
    ]);
    return { sent, opened, clicked, submitted, reported, successRate: successRate(sent, opened, submitted, reported) };
  }

  async dashboard(): Promise<unknown> {
    const [totalCampaigns, running, complete, totalGroups] = await this.prisma.$transaction([
      this.prisma.campaign.count(),
      this.prisma.campaign.count({ where: { status: CampaignStatus.RUNNING } }),
      this.prisma.campaign.count({ where: { status: CampaignStatus.COMPLETE } }),
      this.prisma.targetGroup.count(),
    ]);

    const byType = async (type: 'phishing' | 'email') => {
      const [sent, opened, clicked, submitted, reported] = await this.prisma.$transaction([
        this.prisma.campaignResult.count({ where: { campaign: { type }, status: { in: SENT_RANK } } }),
        this.prisma.campaignResult.count({ where: { campaign: { type }, events: { some: { type: 'OPENED' } } } }),
        this.prisma.campaignResult.count({ where: { campaign: { type }, events: { some: { type: 'CLICKED' } } } }),
        this.prisma.campaignResult.count({ where: { campaign: { type }, events: { some: { type: 'SUBMITTED' } } } }),
        this.prisma.campaignResult.count({ where: { campaign: { type }, reported: true } }),
      ]);
      return { sent, opened, clicked, submitted, reported };
    };
    const [campaignsByType, ph, em] = await Promise.all([
      this.prisma.campaign.groupBy({ by: ['type'], _count: { _all: true } }),
      byType('phishing'),
      byType('email'),
    ]);
    const typeCounts: Record<string, number> = {};
    for (const g of campaignsByType) typeCounts[g.type] = g._count._all;

    const recent = await this.prisma.campaign.findMany({
      where: { launchedAt: { not: null }, type: 'phishing' },
      orderBy: { launchedAt: 'desc' },
      take: 10,
    });
    const series = await Promise.all(
      recent.map(async (c) => ({ id: c.id, name: c.name, launchedAt: c.launchedAt, successRate: (await this.counts(c.id)).successRate })),
    );

    return {
      totals: { campaigns: totalCampaigns, running, complete, groups: totalGroups, phishing: typeCounts.phishing ?? 0, email: typeCounts.email ?? 0 },
      phishing: { ...ph, successRate: successRate(ph.sent, ph.opened, ph.submitted, ph.reported) },
      email: { sent: em.sent, opened: em.opened, clicked: em.clicked, openRate: openRate(em.sent, em.opened), clickRate: clickRate(em.sent, em.clicked) },
      series: series.reverse(),
    };
  }

  async resultsCsv(campaignId: string): Promise<string> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    const rows = await this.prisma.campaignResult.findMany({ where: { campaignId }, orderBy: { createdAt: 'asc' } });
    const header = ['Email', 'First Name', 'Last Name', 'Position', 'Status', 'Reported', 'Error'];
    const lines = rows.map((r) => [r.email, r.firstName, r.lastName, r.position, r.status, r.reported ? 'Yes' : 'No', r.error ?? ''].map(csvCell).join(','));
    return [header.join(','), ...lines].join('\n');
  }

  async eventsCsv(campaignId: string): Promise<string> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    const events = await this.prisma.campaignEvent.findMany({
      where: { result: { campaignId } },
      include: { result: { select: { email: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const header = ['Email', 'Type', 'IP', 'User Agent', 'Timestamp'];
    const lines = events.map((e) => [e.result.email, e.type, e.ip ?? '', e.userAgent ?? '', e.createdAt.toISOString()].map(csvCell).join(','));
    return [header.join(','), ...lines].join('\n');
  }

  async campaignsCsv(): Promise<string> {
    const campaigns = await this.prisma.campaign.findMany({ orderBy: { createdAt: 'desc' } });
    const header = ['Name', 'Status', 'Launched', 'Sent', 'Opened', 'Clicked', 'Submitted', 'Reported', 'Success %'];
    const lines = await Promise.all(campaigns.map(async (c) => {
      const k = await this.counts(c.id);
      return [c.name, c.status, c.launchedAt?.toISOString() ?? '', String(k.sent), String(k.opened), String(k.clicked), String(k.submitted), String(k.reported), String(k.successRate)].map(csvCell).join(',');
    }));
    return [header.join(','), ...lines].join('\n');
  }

  async publicReport(code: string): Promise<unknown> {
    const campaign = await this.resolvePublic(code);
    const counts = await this.counts(campaign.id);
    return {
      name: campaign.name,
      status: campaign.status,
      launchedAt: campaign.launchedAt,
      completedAt: campaign.completedAt,
      sendByDate: campaign.sendByDate,
      mode: campaign.type,
      counts,
    };
  }

  async publicResults(code: string): Promise<unknown[]> {
    const campaign = await this.resolvePublic(code);
    // Public, unauthenticated surface — never dump a 100k campaign; the counts
    // endpoint carries the summary. Cap the per-recipient rows.
    const rows = await this.prisma.campaignResult.findMany({ where: { campaignId: campaign.id }, orderBy: { createdAt: 'asc' }, take: 500 });
    // No email / rid / ids — only non-identifying funnel data.
    return rows.map((r) => ({ firstName: r.firstName, lastName: r.lastName, position: r.position, status: r.status, reported: r.reported }));
  }

  async publicTimeline(code: string): Promise<unknown[]> {
    const campaign = await this.resolvePublic(code);
    const events = await this.prisma.campaignEvent.findMany({ where: { result: { campaignId: campaign.id } }, orderBy: { createdAt: 'asc' }, take: 2000 });
    // No IP / user-agent / payload on the public surface.
    return events.map((e) => ({ type: e.type, createdAt: e.createdAt }));
  }

  private async resolvePublic(code: string) {
    const campaign = await this.prisma.campaign.findFirst({ where: { publicCode: code, publicEnabled: true } });
    if (!campaign) throw new NotFoundException();
    return campaign;
  }
}

function csvCell(v: string): string {
  const needsQuote = /[",\n]/.test(v);
  const escaped = v.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

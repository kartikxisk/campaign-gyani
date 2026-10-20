import { Injectable, NotFoundException } from '@nestjs/common';
import { CampaignStatus, ResultStatus } from '@prisma/client';
import { successRate } from '@cg/shared';
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
    const [sent, opened, clicked, submitted, reported] = await this.prisma.$transaction([
      this.prisma.campaignResult.count({ where: { status: { in: SENT_RANK } } }),
      this.prisma.campaignResult.count({ where: { events: { some: { type: 'OPENED' } } } }),
      this.prisma.campaignResult.count({ where: { events: { some: { type: 'CLICKED' } } } }),
      this.prisma.campaignResult.count({ where: { events: { some: { type: 'SUBMITTED' } } } }),
      this.prisma.campaignResult.count({ where: { reported: true } }),
    ]);
    const recent = await this.prisma.campaign.findMany({
      where: { launchedAt: { not: null } },
      orderBy: { launchedAt: 'desc' },
      take: 10,
    });
    const series = await Promise.all(
      recent.map(async (c) => ({ id: c.id, name: c.name, launchedAt: c.launchedAt, successRate: (await this.counts(c.id)).successRate })),
    );
    return {
      totals: { campaigns: totalCampaigns, running, complete, groups: totalGroups },
      events: { sent, opened, clicked, submitted, reported },
      overallSuccessRate: successRate(sent, opened, submitted, reported),
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

  async publicReport(code: string): Promise<unknown> {
    const campaign = await this.resolvePublic(code);
    const counts = await this.counts(campaign.id);
    return {
      name: campaign.name,
      status: campaign.status,
      launchedAt: campaign.launchedAt,
      completedAt: campaign.completedAt,
      sendByDate: campaign.sendByDate,
      counts,
    };
  }

  async publicResults(code: string): Promise<unknown[]> {
    const campaign = await this.resolvePublic(code);
    const rows = await this.prisma.campaignResult.findMany({ where: { campaignId: campaign.id }, orderBy: { createdAt: 'asc' } });
    // No email / rid / ids — only non-identifying funnel data.
    return rows.map((r) => ({ firstName: r.firstName, lastName: r.lastName, position: r.position, status: r.status, reported: r.reported }));
  }

  async publicTimeline(code: string): Promise<unknown[]> {
    const campaign = await this.resolvePublic(code);
    const events = await this.prisma.campaignEvent.findMany({ where: { result: { campaignId: campaign.id } }, orderBy: { createdAt: 'asc' } });
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

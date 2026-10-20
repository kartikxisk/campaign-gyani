import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { advance, type Repeat } from '@cg/shared';
import { CampaignStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CampaignsService } from './campaigns.service';

@Injectable()
export class RecurrenceService {
  private readonly logger = new Logger(RecurrenceService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly campaigns: CampaignsService,
  ) {}

  @Cron('0 * * * *') // hourly
  async tick(): Promise<void> {
    if (process.env.CG_DISABLE_WORKER === '1') return;
    await this.runDue(new Date());
  }

  /** Clones + launches every recurring campaign whose next run is due, then advances it. */
  async runDue(now: Date): Promise<number> {
    const due = await this.prisma.campaign.findMany({
      where: { repeat: { in: ['DAILY', 'WEEKLY', 'MONTHLY'] }, nextRunAt: { not: null, lte: now }, parentId: null, status: { in: [CampaignStatus.RUNNING, CampaignStatus.SCHEDULED] } },
      include: { templates: true, groups: true },
    });
    let launched = 0;
    for (const parent of due) {
      const next = advance(parent.nextRunAt as Date, parent.repeat as Repeat);
      // Atomically claim this occurrence: only one runner advances nextRunAt, and
      // only while the series is still active. A failed claim means already taken.
      const claim = await this.prisma.campaign.updateMany({
        where: { id: parent.id, nextRunAt: parent.nextRunAt, status: { in: [CampaignStatus.RUNNING, CampaignStatus.SCHEDULED] } },
        data: { nextRunAt: next },
      });
      if (claim.count !== 1) continue;
      try {
        await this.cloneAndLaunch(parent.id);
        launched += 1;
      } catch (e) {
        this.logger.error(`Recurrence of ${parent.id} failed: ${(e as Error).message}`);
      }
    }
    return launched;
  }

  async cloneAndLaunch(parentId: string): Promise<string> {
    const parent = await this.prisma.campaign.findUniqueOrThrow({ where: { id: parentId }, include: { templates: true, groups: true } });
    if (parent.status !== CampaignStatus.RUNNING && parent.status !== CampaignStatus.SCHEDULED) {
      throw new Error('Series no longer active');
    }
    const stamp = new Date().toLocaleDateString();
    const child = await this.prisma.campaign.create({
      data: {
        name: `${parent.name} (${stamp})`,
        sendByDate: new Date(),
        landingPageId: parent.landingPageId,
        sendingProfileId: parent.sendingProfileId,
        shuffleTemplates: parent.shuffleTemplates,
        repeat: 'NONE',
        parentId: parent.id,
        status: CampaignStatus.DRAFT,
        templates: { create: parent.templates.map((t) => ({ templateId: t.templateId })) },
        groups: { create: parent.groups.map((g) => ({ groupId: g.groupId })) },
      },
    });
    await this.campaigns.launch(child.id);
    return child.id;
  }
}

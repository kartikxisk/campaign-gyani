import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { SessionGuard } from '../auth/session.guard';
import { ReportsService } from './reports.service';

@Controller()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('reports/dashboard')
  @UseGuards(SessionGuard)
  dashboard(): Promise<unknown> {
    return this.reports.dashboard();
  }

  @Get('campaigns/:id/report')
  @UseGuards(SessionGuard)
  campaignCounts(@Param('id') id: string) {
    return this.reports.counts(id);
  }

  @Get('reports/campaigns.csv')
  @UseGuards(SessionGuard)
  async campaignsCsv(@Res() res: Response): Promise<void> {
    const csv = await this.reports.campaignsCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="campaigns.csv"');
    res.send(csv);
  }

  @Get('campaigns/:id/export/results.csv')
  @UseGuards(SessionGuard)
  async resultsCsv(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const csv = await this.reports.resultsCsv(id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="campaign-${id}-results.csv"`);
    res.send(csv);
  }

  @Get('campaigns/:id/export/events.csv')
  @UseGuards(SessionGuard)
  async eventsCsv(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const csv = await this.reports.eventsCsv(id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="campaign-${id}-events.csv"`);
    res.send(csv);
  }

  // Public read-only report, resolved by unguessable code. No admin data.
  @Get('public/campaigns/:code')
  publicReport(@Param('code') code: string): Promise<unknown> {
    return this.reports.publicReport(code);
  }

  @Get('public/campaigns/:code/results')
  publicResults(@Param('code') code: string): Promise<unknown[]> {
    return this.reports.publicResults(code);
  }

  @Get('public/campaigns/:code/timeline')
  publicTimeline(@Param('code') code: string): Promise<unknown[]> {
    return this.reports.publicTimeline(code);
  }
}

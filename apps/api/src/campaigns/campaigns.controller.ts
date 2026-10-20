import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { Campaign } from '@prisma/client';
import { campaignCreateSchema, type CampaignCreateDto } from '@cg/shared';
import { z } from 'zod';
import { ZodBodyPipe } from '../common/zod.pipe';
import { SessionGuard } from '../auth/session.guard';
import type { ListParamsInput } from '../common/list-query';
import { CampaignsService } from './campaigns.service';

const visibilitySchema = z.object({ enabled: z.boolean() });

@Controller('campaigns')
@UseGuards(SessionGuard)
export class CampaignsController {
  constructor(private readonly service: CampaignsService) {}

  @Get()
  list(@Query() q: ListParamsInput) {
    return this.service.list(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Campaign> {
    return this.service.findOne(id);
  }

  @Get(':id/results')
  results(@Param('id') id: string) {
    return this.service.results(id);
  }

  @Get(':id/timeline')
  timeline(@Param('id') id: string) {
    return this.service.timeline(id);
  }

  @Post()
  create(@Body(new ZodBodyPipe(campaignCreateSchema)) dto: CampaignCreateDto): Promise<Campaign> {
    return this.service.create(dto);
  }

  @Post(':id/launch')
  launch(@Param('id') id: string): Promise<Campaign> {
    return this.service.launch(id);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string): Promise<Campaign> {
    return this.service.complete(id);
  }

  @Patch(':id/visibility')
  setVisibility(@Param('id') id: string, @Body(new ZodBodyPipe(visibilitySchema)) dto: { enabled: boolean }) {
    return this.service.setVisibility(id, dto.enabled);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ ok: true }> {
    await this.service.remove(id);
    return { ok: true };
  }
}

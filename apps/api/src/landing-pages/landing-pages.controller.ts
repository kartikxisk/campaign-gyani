import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import type { LandingPage } from '@prisma/client';
import { landingPageSchema, type LandingPageDto } from '@cg/shared';
import { ZodBodyPipe } from '../common/zod.pipe';
import { SessionGuard } from '../auth/session.guard';
import type { ListParamsInput, ListResult } from '../common/list-query';
import { LandingPagesService } from './landing-pages.service';

@Controller('landing-pages')
@UseGuards(SessionGuard)
export class LandingPagesController {
  constructor(private readonly service: LandingPagesService) {}

  @Get()
  list(@Query() q: ListParamsInput): Promise<ListResult<LandingPage>> {
    return this.service.list(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<LandingPage> {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body(new ZodBodyPipe(landingPageSchema)) dto: LandingPageDto): Promise<LandingPage> {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body(new ZodBodyPipe(landingPageSchema)) dto: LandingPageDto): Promise<LandingPage> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ ok: true }> {
    await this.service.remove(id);
    return { ok: true };
  }
}

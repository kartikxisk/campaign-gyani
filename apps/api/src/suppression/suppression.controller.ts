import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { Suppression } from '@prisma/client';
import { z } from 'zod';
import { ZodBodyPipe } from '../common/zod.pipe';
import { SessionGuard } from '../auth/session.guard';
import type { ListParamsInput, ListResult } from '../common/list-query';
import { SuppressionService } from './suppression.service';

const addSchema = z.object({ email: z.string().email() });

@Controller('suppressions')
@UseGuards(SessionGuard)
export class SuppressionController {
  constructor(private readonly service: SuppressionService) {}

  @Get()
  list(@Query() q: ListParamsInput): Promise<ListResult<Suppression>> {
    return this.service.list(q);
  }

  @Post()
  add(@Body(new ZodBodyPipe(addSchema)) dto: { email: string }): Promise<Suppression> {
    return this.service.add(dto.email, 'manual');
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ ok: true }> {
    await this.service.remove(id);
    return { ok: true };
  }
}

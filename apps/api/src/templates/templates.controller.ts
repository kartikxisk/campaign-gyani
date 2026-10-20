import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import type { EmailTemplate } from '@prisma/client';
import { emailTemplateSchema, type EmailTemplateDto } from '@cg/shared';
import { ZodBodyPipe } from '../common/zod.pipe';
import { SessionGuard } from '../auth/session.guard';
import type { ListParamsInput, ListResult } from '../common/list-query';
import { TemplatesService } from './templates.service';

@Controller('templates')
@UseGuards(SessionGuard)
export class TemplatesController {
  constructor(private readonly service: TemplatesService) {}

  @Get()
  list(@Query() q: ListParamsInput): Promise<ListResult<EmailTemplate>> {
    return this.service.list(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<EmailTemplate> {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body(new ZodBodyPipe(emailTemplateSchema)) dto: EmailTemplateDto): Promise<EmailTemplate> {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body(new ZodBodyPipe(emailTemplateSchema)) dto: EmailTemplateDto): Promise<EmailTemplate> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ ok: true }> {
    await this.service.remove(id);
    return { ok: true };
  }
}

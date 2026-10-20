import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import type { Target } from '@prisma/client';
import { targetGroupSchema, targetSchema, type TargetGroupDto, type TargetDto } from '@cg/shared';
import { ZodBodyPipe } from '../common/zod.pipe';
import { SessionGuard } from '../auth/session.guard';
import type { ListParamsInput, ListResult } from '../common/list-query';
import { GroupsService, type GroupWithCount } from './groups.service';

@Controller('groups')
@UseGuards(SessionGuard)
export class GroupsController {
  constructor(private readonly service: GroupsService) {}

  @Get()
  list(@Query() q: ListParamsInput): Promise<ListResult<GroupWithCount>> {
    return this.service.list(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<GroupWithCount> {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body(new ZodBodyPipe(targetGroupSchema)) dto: TargetGroupDto): Promise<GroupWithCount> {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body(new ZodBodyPipe(targetGroupSchema)) dto: TargetGroupDto): Promise<GroupWithCount> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ ok: true }> {
    await this.service.remove(id);
    return { ok: true };
  }

  @Get(':id/targets')
  listTargets(@Param('id') id: string): Promise<Target[]> {
    return this.service.listTargets(id);
  }

  @Post(':id/targets')
  addTarget(@Param('id') id: string, @Body(new ZodBodyPipe(targetSchema)) dto: TargetDto): Promise<Target> {
    return this.service.addTarget(id, dto);
  }
}

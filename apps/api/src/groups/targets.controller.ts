import { Body, Controller, Delete, Param, Put, UseGuards } from '@nestjs/common';
import type { Target } from '@prisma/client';
import { targetSchema, type TargetDto } from '@cg/shared';
import { ZodBodyPipe } from '../common/zod.pipe';
import { SessionGuard } from '../auth/session.guard';
import { GroupsService } from './groups.service';

@Controller('targets')
@UseGuards(SessionGuard)
export class TargetsController {
  constructor(private readonly service: GroupsService) {}

  @Put(':id')
  update(@Param('id') id: string, @Body(new ZodBodyPipe(targetSchema)) dto: TargetDto): Promise<Target> {
    return this.service.updateTarget(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ ok: true }> {
    await this.service.removeTarget(id);
    return { ok: true };
  }
}

import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Target } from '@prisma/client';
import { targetGroupSchema, targetSchema, type TargetGroupDto, type TargetDto } from '@cg/shared';
import { ZodBodyPipe } from '../common/zod.pipe';
import { SessionGuard } from '../auth/session.guard';
import type { ListParamsInput, ListResult } from '../common/list-query';
import { GroupsService, type GroupWithCount } from './groups.service';
import { CsvImportService, type ImportResult, MAX_IMPORT_ROWS } from './csv-import.service';

@Controller('groups')
@UseGuards(SessionGuard)
export class GroupsController {
  constructor(
    private readonly service: GroupsService,
    private readonly csv: CsvImportService,
  ) {}

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

  @Post(':id/targets/csv')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  importCsv(@Param('id') id: string, @UploadedFile() file: Express.Multer.File): Promise<ImportResult> {
    if (!file) throw new BadRequestException('A CSV file is required');
    return this.csv.importCsv(id, file.buffer);
  }
}

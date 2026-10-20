import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Target, type TargetGroup } from '@prisma/client';
import type { TargetGroupDto, TargetDto } from '@cg/shared';
import { PrismaService } from '../prisma/prisma.service';
import { parseListQuery, type ListParamsInput, type ListResult } from '../common/list-query';

export type GroupWithCount = TargetGroup & { numTargets: number };

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: TargetGroupDto): Promise<GroupWithCount> {
    const g = await this.prisma.targetGroup.create({ data: { name: dto.name } });
    return { ...g, numTargets: 0 };
  }

  async list(params: ListParamsInput): Promise<ListResult<GroupWithCount>> {
    const { where, orderBy, skip, take, page, limit } = parseListQuery(params, {
      searchFields: ['name'],
      sortable: ['name', 'createdAt', 'updatedAt'],
      defaultSort: 'updatedAt',
    });
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.targetGroup.findMany({ where, orderBy, skip, take, include: { _count: { select: { targets: true } } } }),
      this.prisma.targetGroup.count({ where }),
    ]);
    return { rows: rows.map((r) => ({ ...r, numTargets: r._count.targets })), total, page, limit };
  }

  async findOne(id: string): Promise<GroupWithCount> {
    const g = await this.prisma.targetGroup.findUnique({ where: { id }, include: { _count: { select: { targets: true } } } });
    if (!g) throw new NotFoundException('Group not found');
    return { ...g, numTargets: g._count.targets };
  }

  async update(id: string, dto: TargetGroupDto): Promise<GroupWithCount> {
    await this.ensure(id);
    const g = await this.prisma.targetGroup.update({ where: { id }, data: { name: dto.name } });
    return this.findOne(g.id);
  }

  async remove(id: string): Promise<void> {
    await this.ensure(id);
    // Targets cascade via the schema's onDelete: Cascade.
    await this.prisma.targetGroup.delete({ where: { id } });
  }

  async listTargets(groupId: string): Promise<Target[]> {
    await this.ensure(groupId);
    return this.prisma.target.findMany({ where: { groupId }, orderBy: { createdAt: 'asc' } });
  }

  async addTarget(groupId: string, dto: TargetDto): Promise<Target> {
    await this.ensure(groupId);
    try {
      return await this.prisma.target.create({
        data: { groupId, email: dto.email, firstName: dto.firstName ?? '', lastName: dto.lastName ?? '', position: dto.position ?? '' },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A target with this email already exists in this group');
      }
      throw err;
    }
  }

  async updateTarget(id: string, dto: TargetDto): Promise<Target> {
    const existing = await this.prisma.target.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Target not found');
    try {
      return await this.prisma.target.update({
        where: { id },
        data: { email: dto.email, firstName: dto.firstName ?? '', lastName: dto.lastName ?? '', position: dto.position ?? '' },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A target with this email already exists in this group');
      }
      throw err;
    }
  }

  async removeTarget(id: string): Promise<void> {
    const existing = await this.prisma.target.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Target not found');
    await this.prisma.target.delete({ where: { id } });
  }

  private async ensure(groupId: string): Promise<void> {
    const g = await this.prisma.targetGroup.findUnique({ where: { id: groupId }, select: { id: true } });
    if (!g) throw new NotFoundException('Group not found');
  }
}

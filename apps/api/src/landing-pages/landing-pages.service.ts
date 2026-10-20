import { Injectable, NotFoundException } from '@nestjs/common';
import type { LandingPage, Prisma } from '@prisma/client';
import type { LandingPageDto } from '@cg/shared';
import { PrismaService } from '../prisma/prisma.service';
import { parseListQuery, type ListParamsInput, type ListResult } from '../common/list-query';

@Injectable()
export class LandingPagesService {
  constructor(private readonly prisma: PrismaService) {}

  private toData(dto: LandingPageDto): Prisma.LandingPageUncheckedCreateInput {
    const captureData = dto.captureData ?? false;
    return {
      name: dto.name,
      html: dto.html,
      redirectUrl: dto.redirectUrl,
      captureData,
      // capturePasswords is meaningless without capture; never persist it standalone.
      capturePasswords: captureData ? (dto.capturePasswords ?? false) : false,
    };
  }

  async create(dto: LandingPageDto): Promise<LandingPage> {
    return this.prisma.landingPage.create({ data: this.toData(dto) });
  }

  async list(params: ListParamsInput): Promise<ListResult<LandingPage>> {
    const { where, orderBy, skip, take, page, limit } = parseListQuery(params, {
      searchFields: ['name'],
      sortable: ['name', 'createdAt', 'updatedAt'],
      defaultSort: 'updatedAt',
    });
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.landingPage.findMany({ where, orderBy, skip, take }),
      this.prisma.landingPage.count({ where }),
    ]);
    return { rows, total, page, limit };
  }

  async findOne(id: string): Promise<LandingPage> {
    const row = await this.prisma.landingPage.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Landing page not found');
    return row;
  }

  async update(id: string, dto: LandingPageDto): Promise<LandingPage> {
    await this.findOne(id);
    return this.prisma.landingPage.update({ where: { id }, data: this.toData(dto) });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.landingPage.delete({ where: { id } });
  }
}

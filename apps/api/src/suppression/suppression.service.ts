import { Injectable } from '@nestjs/common';
import type { Suppression } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parseListQuery, type ListParamsInput, type ListResult } from '../common/list-query';

@Injectable()
export class SuppressionService {
  constructor(private readonly prisma: PrismaService) {}

  async add(email: string, reason = 'manual'): Promise<Suppression> {
    const normalized = email.trim().toLowerCase();
    return this.prisma.suppression.upsert({
      where: { email: normalized },
      create: { email: normalized, reason },
      update: {},
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.suppression.deleteMany({ where: { id } });
  }

  async list(params: ListParamsInput): Promise<ListResult<Suppression>> {
    const { where, orderBy, skip, take, page, limit } = parseListQuery(params, {
      searchFields: ['email'],
      sortable: ['email', 'createdAt', 'reason'],
      defaultSort: 'createdAt',
    });
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.suppression.findMany({ where, orderBy, skip, take }),
      this.prisma.suppression.count({ where }),
    ]);
    return { rows, total, page, limit };
  }

  /** Returns the lowercased subset of the given emails that are suppressed. */
  async suppressedSet(emails: string[]): Promise<Set<string>> {
    const lower = emails.map((e) => e.toLowerCase());
    const rows = await this.prisma.suppression.findMany({ where: { email: { in: lower } }, select: { email: true } });
    return new Set(rows.map((r) => r.email));
  }
}

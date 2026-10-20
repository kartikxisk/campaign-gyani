import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { targetSchema } from '@cg/shared';
import { PrismaService } from '../prisma/prisma.service';

export interface SkippedRow {
  row: number;
  reason: string;
}
export interface ImportResult {
  inserted: number;
  skipped: SkippedRow[];
}

const REQUIRED_HEADERS = ['firstName', 'lastName', 'email', 'position'];
export const MAX_IMPORT_ROWS = 100_000;

@Injectable()
export class CsvImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importCsv(groupId: string, buffer: Buffer): Promise<ImportResult> {
    const group = await this.prisma.targetGroup.findUnique({ where: { id: groupId }, select: { id: true } });
    if (!group) throw new NotFoundException('Group not found');

    const text = buffer.toString('utf8').trim();
    if (!text) throw new BadRequestException('The CSV file is empty');

    let records: Record<string, string>[];
    try {
      records = parse(text, { columns: true, skip_empty_lines: true, trim: true, bom: true });
    } catch {
      throw new BadRequestException('The file could not be parsed as CSV');
    }
    const headers = records[0] ? Object.keys(records[0]) : [];
    if (!REQUIRED_HEADERS.every((h) => headers.includes(h))) {
      throw new BadRequestException(`CSV must have the headers: ${REQUIRED_HEADERS.join(', ')}`);
    }
    if (records.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(`A single import is limited to ${MAX_IMPORT_ROWS} rows`);
    }

    const existing = await this.prisma.target.findMany({ where: { groupId }, select: { email: true } });
    const seen = new Set(existing.map((t) => t.email.toLowerCase()));

    const skipped: SkippedRow[] = [];
    const toInsert: { groupId: string; email: string; firstName: string; lastName: string; position: string }[] = [];

    records.forEach((rec, i) => {
      const rowNo = i + 2; // +1 for header, +1 for 1-based
      const parsed = targetSchema.safeParse({
        email: rec.email, firstName: rec.firstName, lastName: rec.lastName, position: rec.position,
      });
      if (!parsed.success) {
        skipped.push({ row: rowNo, reason: parsed.error.issues[0]?.message ?? 'Invalid row' });
        return;
      }
      const key = parsed.data.email.toLowerCase();
      if (seen.has(key)) {
        skipped.push({ row: rowNo, reason: 'Duplicate email' });
        return;
      }
      seen.add(key);
      toInsert.push({ groupId, ...parsed.data });
    });

    let inserted = 0;
    if (toInsert.length > 0) {
      const result = await this.prisma.target.createMany({ data: toInsert, skipDuplicates: true });
      inserted = result.count;
    }
    return { inserted, skipped };
  }
}

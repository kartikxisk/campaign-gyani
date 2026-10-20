import { Injectable, NotFoundException } from '@nestjs/common';
import type { EmailTemplate, Prisma } from '@prisma/client';
import type { EmailTemplateDto } from '@cg/shared';
import { PrismaService } from '../prisma/prisma.service';
import { parseListQuery, type ListParamsInput, type ListResult } from '../common/list-query';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  private toData(dto: EmailTemplateDto): Prisma.EmailTemplateUncheckedCreateInput {
    return {
      name: dto.name,
      envelopeSender: dto.envelopeSender,
      subject: dto.subject,
      textBody: dto.textBody ?? '',
      htmlBody: dto.htmlBody ?? '',
      externalUrl: dto.externalUrl || null,
      attachments: dto.attachments ?? [],
    };
  }

  async create(dto: EmailTemplateDto): Promise<EmailTemplate> {
    return this.prisma.emailTemplate.create({ data: this.toData(dto) });
  }

  async list(params: ListParamsInput): Promise<ListResult<EmailTemplate>> {
    const { where, orderBy, skip, take, page, limit } = parseListQuery(params, {
      searchFields: ['name', 'subject'],
      sortable: ['name', 'subject', 'createdAt', 'updatedAt'],
      defaultSort: 'updatedAt',
    });
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.emailTemplate.findMany({ where, orderBy, skip, take }),
      this.prisma.emailTemplate.count({ where }),
    ]);
    return { rows, total, page, limit };
  }

  async findOne(id: string): Promise<EmailTemplate> {
    const row = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Email template not found');
    return row;
  }

  async update(id: string, dto: EmailTemplateDto): Promise<EmailTemplate> {
    await this.findOne(id);
    return this.prisma.emailTemplate.update({ where: { id }, data: this.toData(dto) });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.emailTemplate.delete({ where: { id } });
  }
}

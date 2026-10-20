import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { ZodBodyPipe } from '../common/zod.pipe';
import { SessionGuard } from '../auth/session.guard';
import { ImportService, type ParsedEmail } from './import.service';
import { UnsafeUrlError } from './ssrf-guard';

const emailSchema = z.object({ source: z.string().min(1), convertLinks: z.boolean().default(false) });
const siteSchema = z.object({ url: z.string().min(1) });

@Controller('import')
@UseGuards(SessionGuard)
export class ImportController {
  constructor(private readonly service: ImportService) {}

  @Post('email')
  importEmail(@Body(new ZodBodyPipe(emailSchema)) dto: { source: string; convertLinks: boolean }): Promise<ParsedEmail> {
    return this.service.importEmail(dto.source, dto.convertLinks);
  }

  @Post('site')
  async importSite(@Body(new ZodBodyPipe(siteSchema)) dto: { url: string }): Promise<{ html: string }> {
    try {
      return await this.service.importSite(dto.url);
    } catch (err) {
      if (err instanceof UnsafeUrlError) throw new BadRequestException(err.message);
      throw new BadRequestException('Could not fetch the site');
    }
  }
}

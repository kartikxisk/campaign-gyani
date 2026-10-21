import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { ZodBodyPipe } from '../common/zod.pipe';
import { SessionGuard } from '../auth/session.guard';
import { ConfigStoreService, type AppConfig } from './config.service';

const configSchema = z.object({
  brandName: z.string().trim().min(1).max(60).optional(),
  logoUrl: z.string().url().nullable().optional().or(z.literal('')),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  timezone: z.string().min(1).max(64).optional(),
  emailFooter: z.string().max(2000).optional(),
});

@Controller('config')
export class ConfigController {
  constructor(private readonly config: ConfigStoreService) {}

  // Public: branding (name, logo, color) is needed to render the login page.
  @Get()
  get(): Promise<AppConfig> {
    return this.config.get();
  }

  @Put()
  @UseGuards(SessionGuard)
  update(@Body(new ZodBodyPipe(configSchema)) dto: Partial<AppConfig>): Promise<AppConfig> {
    const clean = { ...dto, logoUrl: dto.logoUrl === '' ? null : dto.logoUrl };
    return this.config.update(clean);
  }
}

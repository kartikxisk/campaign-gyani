import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { APP_MODES, type AppMode } from '@cg/shared';
import { ZodBodyPipe } from '../common/zod.pipe';
import { SessionGuard } from '../auth/session.guard';
import { SettingsService } from './settings.service';

const modeSchema = z.object({ mode: z.enum(APP_MODES) });

@Controller('settings')
@UseGuards(SessionGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('mode')
  async getMode(): Promise<{ mode: AppMode | null }> {
    return { mode: await this.settings.getMode() };
  }

  @Post('mode')
  async setMode(@Body(new ZodBodyPipe(modeSchema)) dto: { mode: AppMode }): Promise<{ mode: AppMode }> {
    return { mode: await this.settings.setMode(dto.mode) };
  }
}

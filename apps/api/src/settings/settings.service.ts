import { ConflictException, Injectable } from '@nestjs/common';
import { APP_MODES, type AppMode } from '@cg/shared';
import { PrismaService } from '../prisma/prisma.service';

const SINGLETON = 'app';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMode(): Promise<AppMode | null> {
    const row = await this.prisma.appSetting.findUnique({ where: { id: SINGLETON } });
    return (row?.mode as AppMode | undefined) ?? null;
  }

  async setMode(mode: AppMode): Promise<AppMode> {
    if (!APP_MODES.includes(mode)) throw new ConflictException('Unknown mode');
    const existing = await this.getMode();
    if (existing) throw new ConflictException('Mode is already set and cannot be changed');
    await this.prisma.appSetting.upsert({
      where: { id: SINGLETON },
      create: { id: SINGLETON, mode, setAt: new Date() },
      update: { mode, setAt: new Date() },
    });
    return mode;
  }
}

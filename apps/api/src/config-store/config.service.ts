import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AppConfig {
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  timezone: string;
  emailFooter: string;
}

const DEFAULTS: AppConfig = {
  brandName: 'Campaign-Gyani',
  logoUrl: null,
  primaryColor: '#0891b2',
  timezone: 'UTC',
  emailFooter: '',
};

@Injectable()
export class ConfigStoreService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<AppConfig> {
    const row = await this.prisma.appSetting.findUnique({ where: { id: 'app' } });
    const stored = (row?.config as Partial<AppConfig> | null) ?? {};
    return { ...DEFAULTS, ...stored };
  }

  async update(patch: Partial<AppConfig>): Promise<AppConfig> {
    const current = await this.get();
    const merged = { ...current, ...patch };
    await this.prisma.appSetting.upsert({
      where: { id: 'app' },
      create: { id: 'app', config: merged },
      update: { config: merged },
    });
    return merged;
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AppConfig {
  brandName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  timezone: string;
  emailFooter: string;
  // Base URL victim-facing links are built from (tracking, landing, assets).
  // Must be set by an admin before sending or sharing links.
  publicBaseUrl: string;
}

const DEFAULTS: AppConfig = {
  brandName: 'Campaign-Gyani',
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#0891b2',
  timezone: 'UTC',
  emailFooter: '',
  publicBaseUrl: '',
};

@Injectable()
export class ConfigStoreService {
  constructor(private readonly prisma: PrismaService) {}

  /** The admin-configured public base URL (no trailing slash). Throws if unset. */
  async publicBaseUrl(): Promise<string> {
    const url = (await this.get()).publicBaseUrl.trim();
    if (!url) throw new BadRequestException('Public base URL is not configured. Set it in Settings before sending or sharing links.');
    return url.replace(/\/+$/, '');
  }

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

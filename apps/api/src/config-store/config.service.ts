import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';

export interface AppConfig {
  brandName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  timezone: string;
  emailFooter: string;
  // Base URL victim-facing links are built from (tracking, landing, assets).
  // Empty means "use the PUBLIC_BASE_URL env default".
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
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Pick<Env, 'PUBLIC_BASE_URL'>,
  ) {}

  /** The effective public base URL: the admin override if set, else the env default. No trailing slash. */
  async publicBaseUrl(): Promise<string> {
    const override = (await this.get()).publicBaseUrl.trim();
    return (override || this.env.PUBLIC_BASE_URL).replace(/\/+$/, '');
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

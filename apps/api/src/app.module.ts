import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { AssetsModule } from './assets/assets.module';
import { SendingProfilesModule } from './sending-profiles/sending-profiles.module';
import { TemplatesModule } from './templates/templates.module';
import { LandingPagesModule } from './landing-pages/landing-pages.module';
import { GroupsModule } from './groups/groups.module';
import { RenderModule } from './render/render.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { TrackingModule } from './tracking/tracking.module';
import { ReportsModule } from './reports/reports.module';
import { ImportModule } from './import/import.module';
import { SettingsModule } from './settings/settings.module';
import { SuppressionModule } from './suppression/suppression.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { CsrfGuard } from './auth/csrf.guard';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    AssetsModule,
    SendingProfilesModule,
    TemplatesModule,
    LandingPagesModule,
    GroupsModule,
    RenderModule,
    CampaignsModule,
    TrackingModule,
    ReportsModule,
    ImportModule,
    SettingsModule,
    SuppressionModule,
    WebhooksModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    ScheduleModule.forRoot(),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule {}

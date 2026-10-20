import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CsrfGuard } from './auth/csrf.guard';

@Module({
  imports: [ConfigModule, PrismaModule, HealthModule, AuthModule],
  providers: [{ provide: APP_GUARD, useClass: CsrfGuard }],
})
export class AppModule {}

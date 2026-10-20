import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { config as loadDotenv } from 'dotenv';
import { AppModule } from './app.module';
import { configureApp } from './setup-app';
import { loadEnv } from './config/env';
import { PrismaService } from './prisma/prisma.service';
import { hashPassword } from './auth/crypto.util';

async function bootstrap(): Promise<void> {
  loadDotenv();
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);
  await configureApp(app, env);
  await ensureAdmin(app.get(PrismaService), env);
  await app.listen(env.API_PORT);
  // eslint-disable-next-line no-console
  console.log(`API listening on ${env.API_PORT}`);
}

async function ensureAdmin(prisma: PrismaService, env: ReturnType<typeof loadEnv>): Promise<void> {
  const existing = await prisma.adminUser.findUnique({ where: { email: env.ADMIN_EMAIL } });
  if (!existing) {
    await prisma.adminUser.create({ data: { email: env.ADMIN_EMAIL, passwordHash: await hashPassword(env.ADMIN_INITIAL_PASSWORD) } });
    // eslint-disable-next-line no-console
    console.log(`Seeded initial admin ${env.ADMIN_EMAIL}`);
  }
}

void bootstrap();

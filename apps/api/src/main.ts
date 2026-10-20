import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { config as loadDotenv } from 'dotenv';
import { AppModule } from './app.module';
import { configureApp } from './setup-app';
import { loadEnv } from './config/env';

async function bootstrap(): Promise<void> {
  loadDotenv();
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);
  await configureApp(app, env);
  await app.listen(env.API_PORT);
}

void bootstrap();

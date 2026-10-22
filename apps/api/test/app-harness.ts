import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup-app';
import { loadEnv } from '../src/config/env';
import { ConfigStoreService } from '../src/config-store/config.service';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  await configureApp(app, loadEnv());
  await app.init();
  // Link building now requires an admin-configured public base URL; seed it so
  // tracking/landing/export tests have one.
  await app.get(ConfigStoreService).update({ publicBaseUrl: 'http://localhost:8099' });
  return app;
}

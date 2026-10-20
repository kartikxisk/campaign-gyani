import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import type { Env } from './config/env';

export async function configureApp(app: INestApplication, env: Env): Promise<void> {
  app.setGlobalPrefix('api', { exclude: ['v/:rid', 'r/:code'] });
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser(env.SESSION_SECRET));

  const redisClient = createClient({ url: env.REDIS_URL });
  await redisClient.connect();
  const store = new RedisStore({ client: redisClient, prefix: 'cg:sess:' });

  app.use(
    session({
      store,
      name: 'cg.sid',
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.PUBLIC_BASE_URL.startsWith('https'),
        maxAge: 1000 * 60 * 60 * 12,
      },
    }),
  );

  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });

  const closable = app as unknown as { _cgRedis?: typeof redisClient };
  closable._cgRedis = redisClient;
}

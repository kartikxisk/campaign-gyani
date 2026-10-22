import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction } from 'express';
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
  // Email templates carry inline-image HTML and base64 attachments, and cloned
  // landing pages carry full-page HTML — all well past Express's 100kb default.
  // 10mb bounds abuse; file uploads use multipart (multer), not these parsers.
  const BODY_LIMIT = '10mb';
  // The raised limit is for authenticated template/landing-page writes. The
  // unauthenticated capture endpoint (POST /api/t/s/:rid) only ever receives a
  // login form's fields, so cap it far lower (registered before the parsers so
  // an oversized forged POST is rejected before its body is read).
  const SUBMIT_MAX_BYTES = 64 * 1024;
  app.use('/api/t/s', (req: Request, res: Response, next: NextFunction) => {
    if (Number(req.headers['content-length'] ?? 0) > SUBMIT_MAX_BYTES) {
      res.status(413).json({ statusCode: 413, error: 'Payload Too Large', message: 'Payload too large' });
      return;
    }
    next();
  });
  const expressApp = app as NestExpressApplication;
  expressApp.useBodyParser('json', { limit: BODY_LIMIT });
  expressApp.useBodyParser('urlencoded', { extended: true, limit: BODY_LIMIT });
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
        secure: env.WEB_ORIGIN.startsWith('https'),
        maxAge: 1000 * 60 * 60 * 12,
      },
    }),
  );

  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });

}

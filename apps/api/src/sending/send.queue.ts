import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';
import type { SendJob, SendQueue } from './send-queue.port';

export const SEND_QUEUE_NAME = 'send';
export const MAX_SEND_ATTEMPTS = 3;

@Injectable()
export class BullSendQueue implements SendQueue, OnModuleDestroy {
  private readonly logger = new Logger(BullSendQueue.name);
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor(@Inject(ENV) env: Pick<Env, 'REDIS_URL'>) {
    this.connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    this.queue = new Queue(SEND_QUEUE_NAME, { connection: this.connection });
  }

  async enqueue(jobs: SendJob[]): Promise<void> {
    const now = Date.now();
    await this.queue.addBulk(
      jobs.map((j) => ({
        name: 'send',
        data: { resultId: j.resultId },
        opts: {
          delay: Math.max(0, j.sendAt - now),
          attempts: MAX_SEND_ATTEMPTS,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: true,
          removeOnFail: 1000,
        },
      })),
    );
    this.logger.log(`Enqueued ${jobs.length} send job(s)`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close().catch(() => undefined);
    await this.connection.quit().catch(() => undefined);
  }
}

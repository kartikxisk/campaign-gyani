import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';
import { SendProcessor } from './send.processor';
import { SEND_QUEUE_NAME, MAX_SEND_ATTEMPTS } from './send.queue';

@Injectable()
export class SendWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SendWorker.name);
  private worker?: Worker;
  private connection?: Redis;

  constructor(
    @Inject(ENV) private readonly env: Pick<Env, 'REDIS_URL'>,
    private readonly processor: SendProcessor,
  ) {}

  onModuleInit(): void {
    // Disabled under test; the API and the worker can also run as separate
    // processes in production (see worker entrypoint).
    if (process.env.CG_DISABLE_WORKER === '1') return;
    this.connection = new Redis(this.env.REDIS_URL, { maxRetriesPerRequest: null });
    this.worker = new Worker(
      SEND_QUEUE_NAME,
      async (job) => {
        const attempt = job.attemptsMade + 1;
        await this.processor.deliver(job.data.resultId as string, attempt, job.opts.attempts ?? MAX_SEND_ATTEMPTS);
      },
      { connection: this.connection, concurrency: 5 },
    );
    this.worker.on('failed', (job, err) => this.logger.warn(`Job ${job?.id} failed: ${err.message}`));
    this.logger.log('Send worker started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }
}

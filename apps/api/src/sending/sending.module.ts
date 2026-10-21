import { Module } from '@nestjs/common';
import { SuppressionModule } from '../suppression/suppression.module';
import { ConfigStoreModule } from '../config-store/config-store.module';
import { Circuit } from './circuit';
import { NodemailerMailer, MAILER } from './mailer';
import { SendProcessor } from './send.processor';
import { BullSendQueue } from './send.queue';
import { SendWorker } from './send.worker';
import { SEND_QUEUE } from './send-queue.port';

@Module({
  imports: [SuppressionModule, ConfigStoreModule],
  providers: [
    { provide: MAILER, useClass: NodemailerMailer },
    { provide: Circuit, useFactory: () => new Circuit() },
    SendProcessor,
    SendWorker,
    { provide: SEND_QUEUE, useClass: BullSendQueue },
  ],
  exports: [SEND_QUEUE],
})
export class SendingModule {}

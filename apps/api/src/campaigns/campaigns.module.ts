import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { SEND_QUEUE, NoopSendQueue } from '../sending/send-queue.port';

@Module({
  imports: [AuthModule],
  providers: [CampaignsService, { provide: SEND_QUEUE, useClass: NoopSendQueue }],
  controllers: [CampaignsController],
  exports: [CampaignsService],
})
export class CampaignsModule {}

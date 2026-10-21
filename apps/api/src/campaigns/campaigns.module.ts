import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SendingModule } from '../sending/sending.module';
import { SuppressionModule } from '../suppression/suppression.module';
import { CampaignsService } from './campaigns.service';
import { RecurrenceService } from './recurrence.service';
import { CampaignsController } from './campaigns.controller';

@Module({
  imports: [AuthModule, SendingModule, SuppressionModule],
  providers: [CampaignsService, RecurrenceService],
  controllers: [CampaignsController],
  exports: [CampaignsService],
})
export class CampaignsModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SendingModule } from '../sending/sending.module';
import { SettingsModule } from '../settings/settings.module';
import { SuppressionModule } from '../suppression/suppression.module';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';

@Module({
  imports: [AuthModule, SendingModule, SettingsModule, SuppressionModule],
  providers: [CampaignsService],
  controllers: [CampaignsController],
  exports: [CampaignsService],
})
export class CampaignsModule {}

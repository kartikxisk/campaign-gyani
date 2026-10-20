import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SendingModule } from '../sending/sending.module';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';

@Module({
  imports: [AuthModule, SendingModule],
  providers: [CampaignsService],
  controllers: [CampaignsController],
  exports: [CampaignsService],
})
export class CampaignsModule {}

import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { SuppressionModule } from '../suppression/suppression.module';
import { TrackingService } from './tracking.service';
import { TrackingController } from './tracking.controller';

@Module({
  imports: [SettingsModule, SuppressionModule],
  providers: [TrackingService],
  controllers: [TrackingController],
  exports: [TrackingService],
})
export class TrackingModule {}

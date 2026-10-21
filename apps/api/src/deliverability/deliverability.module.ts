import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DeliverabilityController } from './deliverability.controller';
import { DeliverabilityService } from './deliverability.service';

@Module({
  imports: [AuthModule],
  controllers: [DeliverabilityController],
  providers: [DeliverabilityService],
  exports: [DeliverabilityService],
})
export class DeliverabilityModule {}

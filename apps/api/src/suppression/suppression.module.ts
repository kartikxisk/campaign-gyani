import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SuppressionService } from './suppression.service';
import { SuppressionController } from './suppression.controller';

@Module({
  imports: [AuthModule],
  providers: [SuppressionService],
  controllers: [SuppressionController],
  exports: [SuppressionService],
})
export class SuppressionModule {}

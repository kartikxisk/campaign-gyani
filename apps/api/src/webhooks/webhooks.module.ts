import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SuppressionModule } from '../suppression/suppression.module';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [AuthModule, SuppressionModule],
  providers: [WebhooksService],
  controllers: [WebhooksController],
})
export class WebhooksModule {}

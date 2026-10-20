import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LandingPagesService } from './landing-pages.service';
import { LandingPagesController } from './landing-pages.controller';

@Module({
  imports: [AuthModule],
  providers: [LandingPagesService],
  controllers: [LandingPagesController],
  exports: [LandingPagesService],
})
export class LandingPagesModule {}

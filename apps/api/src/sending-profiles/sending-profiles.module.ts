import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SendingProfilesService } from './sending-profiles.service';
import { SendingProfilesController } from './sending-profiles.controller';

@Module({
  imports: [AuthModule],
  providers: [SendingProfilesService],
  controllers: [SendingProfilesController],
  exports: [SendingProfilesService],
})
export class SendingProfilesModule {}

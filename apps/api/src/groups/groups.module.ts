import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { TargetsController } from './targets.controller';

@Module({
  imports: [AuthModule],
  providers: [GroupsService],
  controllers: [GroupsController, TargetsController],
  exports: [GroupsService],
})
export class GroupsModule {}

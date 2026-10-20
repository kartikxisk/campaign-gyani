import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SessionGuard } from './session.guard';

@Module({
  providers: [AuthService, SessionGuard],
  controllers: [AuthController],
  exports: [AuthService, SessionGuard],
})
export class AuthModule {}

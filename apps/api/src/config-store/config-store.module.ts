import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConfigStoreService } from './config.service';
import { ConfigController } from './config.controller';

@Global()
@Module({
  imports: [AuthModule],
  providers: [ConfigStoreService],
  controllers: [ConfigController],
  exports: [ConfigStoreService],
})
export class ConfigStoreModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ImportService } from './import.service';
import { ImportController } from './import.controller';

@Module({
  imports: [AuthModule],
  providers: [{ provide: ImportService, useFactory: () => new ImportService() }],
  controllers: [ImportController],
  exports: [ImportService],
})
export class ImportModule {}

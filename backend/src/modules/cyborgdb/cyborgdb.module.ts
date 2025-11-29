import { Module, Global } from '@nestjs/common';
import { CyborgDbService } from './cyborgdb.service';

@Global()
@Module({
  providers: [CyborgDbService],
  exports: [CyborgDbService],
})
export class CyborgDbModule {}

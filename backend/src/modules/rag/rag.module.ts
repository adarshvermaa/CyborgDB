import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { DocumentChunkerService } from './document-chunker.service';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { CyborgDbModule } from '../cyborgdb/cyborgdb.module';

@Module({
  imports: [EmbeddingsModule, EncryptionModule, CyborgDbModule],
  providers: [RagService, DocumentChunkerService],
  exports: [RagService],
})
export class RagModule {}

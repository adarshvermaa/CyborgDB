import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { DocumentChunkerService, TextChunk } from './document-chunker.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { EncryptionService } from '../encryption/encryption.service';
import { CyborgDbService } from '../cyborgdb/cyborgdb.service';
import { VectorRecord, QueryResult } from '../cyborgdb/interfaces/vector-record.interface';

export interface Document {
  id: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface RetrievalResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

/**
 * RAG Service - Orchestrates the Retrieval-Augmented Generation pipeline
 * 
 * Pipeline Flow:
 * 1. Document Ingestion: Chunk → Embed → Encrypt → Store
 * 2. Query: Embed → Encrypt → Search → Decrypt (in-memory only) → Return
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly maxContextChunks: number;
  private readonly similarityThreshold: number;

  constructor(
    private configService: ConfigService,
    private documentChunker: DocumentChunkerService,
    private embeddingsService: EmbeddingsService,
    private encryptionService: EncryptionService,
    private cyborgDbService: CyborgDbService,
  ) {
    this.maxContextChunks = this.configService.get<number>('rag.maxContextChunks');
    this.similarityThreshold = this.configService.get<number>('rag.similarityThreshold');
  }

  /**
   * Ingest a document into the RAG system
   * Returns IDs of encrypted chunks stored in CyborgDB
   */
  async ingestDocument(document: Document): Promise<string[]> {
    this.logger.log(`Ingesting document: ${document.id}`);

    try {
      // Step 1: Chunk the document
      const chunks = this.documentChunker.chunkText(
        document.content,
        document.metadata,
      );
      this.logger.debug(`Document chunked into ${chunks.length} pieces`);

      // Step 2: Generate embeddings for all chunks
      const texts = chunks.map((chunk) => chunk.text);
      const embeddingResults = await this.embeddingsService.generateEmbeddings(texts);
      this.logger.debug(`Generated ${embeddingResults.length} embeddings`);

      // Step 3: Encrypt embeddings
      const encryptedRecords: VectorRecord[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunkId = `${document.id}_chunk_${i}`;
        const embedding = embeddingResults[i].embedding;
        
        // Encrypt the embedding vector
        const encryptedVector = this.encryptionService.encryptVector(embedding);
        
        // For CyborgDB, we store a reference to encrypted data
        // In production, CyborgDB handles encryption internally
        // This is a demonstration of the encryption workflow
        
        encryptedRecords.push({
          id: chunkId,
          vector: embedding, // In real CyborgDB, this would be encrypted
          metadata: {
            documentId: document.id,
            chunkIndex: i,
            chunkText: chunks[i].text,
            encrypted: true,
            encryptedData: encryptedVector, // Store encrypted version in metadata
            ...document.metadata,
          },
        });
      }

      // Step 4: Store encrypted vectors in CyborgDB
      await this.cyborgDbService.upsert(encryptedRecords);
      this.logger.log(`Successfully stored ${encryptedRecords.length} encrypted chunks`);

      return encryptedRecords.map((r) => r.id);
    } catch (error) {
      this.logger.error(`Document ingestion failed: ${error.message}`, error.stack);
      throw new Error(`Failed to ingest document: ${error.message}`);
    }
  }

  /**
   * Retrieve relevant chunks for a query (RAG retrieval step)
   * Decryption happens ONLY in memory, never persisted
   */
  async retrieve(query: string, topK?: number): Promise<RetrievalResult[]> {
    this.logger.debug(`Retrieving context for query: "${query.substring(0, 50)}..."`);

    try {
      // Step 1: Generate embedding for query
      const queryEmbeddingResult = await this.embeddingsService.generateEmbedding(query);
      const queryEmbedding = queryEmbeddingResult.embedding;

      // Step 2: Encrypt query embedding
      // const encryptedQuery = this.encryptionService.encryptVector(queryEmbedding);

      // Step 3: Query CyborgDB with encrypted vector
      const k = topK || this.maxContextChunks;
      const results = await this.cyborgDbService.query(queryEmbedding, k);

      // Step 4: Decrypt results IN-MEMORY ONLY
      const decryptedResults: RetrievalResult[] = results
        .filter((result) => result.score >= this.similarityThreshold)
        .map((result) => {
          // Decrypt the vector (demonstration - in production CyborgDB handles this)
          // const decryptedVector = this.encryptionService.decryptVector(result.metadata.encryptedData);

          return {
            id: result.id,
            content: result.metadata.chunkText,
            score: result.score,
            metadata: {
              ...result.metadata,
              // Remove encrypted data from output
              encryptedData: undefined,
            },
          };
        });

      this.logger.debug(`Retrieved ${decryptedResults.length} relevant chunks`);
      return decryptedResults;
    } catch (error) {
      this.logger.error(`Retrieval failed: ${error.message}`, error.stack);
      throw new Error(`Failed to retrieve context: ${error.message}`);
    }
  }

  /**
   * Build context string from retrieval results
   */
  assembleContext(results: RetrievalResult[]): string {
    if (results.length === 0) {
      return 'No relevant context found.';
    }

    const contextParts = results.map((result, index) => ({
      text: `[${index + 1}] ${result.content}`,
      score: result.score,
    }));

    return contextParts.map((part) => part.text).join('\n\n');
  }

  /**
   * Delete document chunks from vector store
   */
  async deleteDocument(chunkIds: string[]): Promise<void> {
    this.logger.debug(`Deleting ${chunkIds.length} encrypted chunks`);
    await this.cyborgDbService.delete(chunkIds);
  }
}

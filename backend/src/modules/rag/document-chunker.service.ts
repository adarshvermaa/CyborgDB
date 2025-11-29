import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TextChunk {
  text: string;
  index: number;
  metadata?: Record<string, any>;
}

/**
 * Document Chunker Service
 * Splits large documents into manageable chunks for embedding generation
 */
@Injectable()
export class DocumentChunkerService {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor(private configService: ConfigService) {
    this.chunkSize = this.configService.get<number>('rag.chunkSize');
    this.chunkOverlap = this.configService.get<number>('rag.chunkOverlap');
  }

  /**
   * Chunk text with sliding window approach
   */
  chunkText(text: string, metadata?: Record<string, any>): TextChunk[] {
    const chunks: TextChunk[] = [];
    
    // Split by sentences first (basic approach)
    const sentences = this.splitIntoSentences(text);
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const sentence of sentences) {
      // If adding this sentence exceeds chunk size, save current chunk
      if (currentChunk.length + sentence.length > this.chunkSize && currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          index: chunkIndex++,
          metadata,
        });
        
        // Start new chunk with overlap
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(this.chunkOverlap / 5)); // Approximate overlap
        currentChunk = overlapWords.join(' ') + ' ';
      }
      
      currentChunk += sentence + ' ';
    }
    
    // Add final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex,
        metadata,
      });
    }
    
    return chunks;
  }

  /**
   * Simple sentence splitter
   */
  private splitIntoSentences(text: string): string[] {
    // Basic sentence splitting (can be improved with NLP libraries)
    return text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
}

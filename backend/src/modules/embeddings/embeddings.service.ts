import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import axios from 'axios';

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: number;
}

/**
 * Embeddings Service
 * Supports both OpenAI and Ollama embedding models
 */
@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly provider: string;
  private openaiClient?: OpenAI;
  private ollamaBaseUrl?: string;
  private embeddingModel: string;

  constructor(private configService: ConfigService) {
    this.provider = this.configService.get<string>('embeddings.provider');

    if (this.provider === 'openai') {
      const apiKey = this.configService.get<string>('embeddings.openai.apiKey');
      this.embeddingModel = this.configService.get<string>(
        'embeddings.openai.embeddingModel',
      );
      
      if (!apiKey) {
        this.logger.warn('OpenAI API key not configured');
      } else {
        this.openaiClient = new OpenAI({ apiKey });
        this.logger.log(`Embeddings service initialized with OpenAI (${this.embeddingModel})`);
      }
    } else if (this.provider === 'ollama') {
      this.ollamaBaseUrl = this.configService.get<string>(
        'embeddings.ollama.baseUrl',
      );
      this.embeddingModel = this.configService.get<string>(
        'embeddings.ollama.embeddingModel',
      );
      this.logger.log(`Embeddings service initialized with Ollama (${this.embeddingModel})`);
    } else {
      throw new Error(`Unsupported embedding provider: ${this.provider}`);
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (this.provider === 'openai') {
      return this.generateOpenAIEmbedding(text);
    } else {
      return this.generateOllamaEmbedding(text);
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    const maxConcurrent = this.configService.get<number>(
      'performance.maxConcurrentEmbeddings',
    );

    // Process in batches to avoid rate limits
    const results: EmbeddingResult[] = [];
    
    for (let i = 0; i < texts.length; i += maxConcurrent) {
      const batch = texts.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(
        batch.map((text) => this.generateEmbedding(text)),
      );
      results.push(...batchResults);
      
      this.logger.debug(`Generated ${results.length}/${texts.length} embeddings`);
    }

    return results;
  }

  /**
   * OpenAI embedding generation
   */
  private async generateOpenAIEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      if (!this.openaiClient) {
        throw new Error('OpenAI client not initialized');
      }

      const response = await this.openaiClient.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });

      return {
        embedding: response.data[0].embedding,
        model: this.embeddingModel,
        usage: response.usage.total_tokens,
      };
    } catch (error) {
      this.logger.error('OpenAI embedding generation failed', error.stack);
      throw new Error(`OpenAI embedding failed: ${error.message}`);
    }
  }

  /**
   * Ollama embedding generation (local deployment)
   */
  private async generateOllamaEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      const response = await axios.post(
        `${this.ollamaBaseUrl}/api/embeddings`,
        {
          model: this.embeddingModel,
          prompt: text,
        },
      );

      return {
        embedding: response.data.embedding,
        model: this.embeddingModel,
        usage: 0, // Ollama doesn't return token usage
      };
    } catch (error) {
      this.logger.error('Ollama embedding generation failed', error.stack);
      throw new Error(`Ollama embedding failed: ${error.message}`);
    }
  }

  /**
   * Get embedding dimension
   */
  getEmbeddingDimension(): number {
    // text-embedding-3-small: 1536
    // text-embedding-3-large: 3072
    // nomic-embed-text: 768
    
    if (this.embeddingModel.includes('small')) {
      return 1536;
    } else if (this.embeddingModel.includes('large')) {
      return 3072;
    } else if (this.embeddingModel.includes('nomic')) {
      return 768;
    }
    
    return 1536; // default
  }
}

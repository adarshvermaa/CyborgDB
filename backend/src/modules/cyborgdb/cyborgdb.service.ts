import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  VectorRecord,
  QueryResult,
  CyborgDbConfig,
} from './interfaces/vector-record.interface';

/**
 * CyborgDB Service - Adapter for encrypted vector search
 * 
 * This is a demonstration adapter. In production, replace with the actual
 * CyborgDB SDK once available. The interface demonstrates the expected
 * operations for encrypted vector storage and retrieval.
 */
@Injectable()
export class CyborgDbService {
  private readonly logger = new Logger(CyborgDbService.name);
  private readonly client: AxiosInstance;
  private readonly config: CyborgDbConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      apiUrl: this.configService.get<string>('cyborgdb.apiUrl'),
      apiKey: this.configService.get<string>('cyborgdb.apiKey'),
      indexName: this.configService.get<string>('cyborgdb.indexName'),
      dimension: this.configService.get<number>('cyborgdb.dimension'),
      metric: this.configService.get<string>('cyborgdb.metric'),
    };

    // Initialize HTTP client for CyborgDB API only if configured
    if (this.config.apiUrl && this.config.apiKey) {
      this.client = axios.create({
        baseURL: this.config.apiUrl,
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
      this.logger.log('CyborgDB Service initialized with API configuration');
    } else {
      this.logger.warn('CyborgDB Service initialized without API configuration - vector operations will not be available');
    }
  }

  /**
   * Upsert encrypted vectors into CyborgDB
   * Vectors should already be encrypted before calling this method
   */
  async upsert(records: VectorRecord[]): Promise<void> {
    try {
      this.logger.debug(`Upserting ${records.length} encrypted vectors`);

      // In production, replace with actual CyborgDB SDK call
      // Example: await this.cyborgDbClient.upsert(this.config.indexName, records);
      
      const response = await this.client.post(
        `/indexes/${this.config.indexName}/upsert`,
        {
          vectors: records.map((record) => ({
            id: record.id,
            values: record.vector,
            metadata: record.metadata,
          })),
        },
      );

      this.logger.debug(`Successfully upserted ${records.length} vectors`);
    } catch (error) {
      this.logger.error('Error upserting vectors to CyborgDB', error.stack);
      throw new Error(`Failed to upsert vectors: ${error.message}`);
    }
  }

  /**
   * Query encrypted vectors by similarity
   * Query vector should be encrypted before calling this method
   * Results are returned encrypted and must be decrypted separately
   */
  async query(
    queryVector: number[],
    topK = 5,
    filter?: Record<string, any>,
  ): Promise<QueryResult[]> {
    try {
      this.logger.debug(`Querying encrypted vectors (topK: ${topK})`);

      // In production, replace with actual CyborgDB SDK call
      // Example: await this.cyborgDbClient.query(this.config.indexName, queryVector, topK);

      const response = await this.client.post(
        `/indexes/${this.config.indexName}/query`,
        {
          vector: queryVector,
          topK,
          filter,
          includeMetadata: true,
        },
      );

      const results: QueryResult[] = response.data.matches.map((match: any) => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata,
      }));

      this.logger.debug(`Found ${results.length} similar vectors`);
      return results;
    } catch (error) {
      this.logger.error('Error querying CyborgDB', error.stack);
      throw new Error(`Failed to query vectors: ${error.message}`);
    }
  }

  /**
   * Delete vectors by ID
   */
  async delete(ids: string[]): Promise<void> {
    try {
      this.logger.debug(`Deleting ${ids.length} vectors`);

      await this.client.post(`/indexes/${this.config.indexName}/delete`, {
        ids,
      });

      this.logger.debug(`Successfully deleted ${ids.length} vectors`);
    } catch (error) {
      this.logger.error('Error deleting vectors from CyborgDB', error.stack);
      throw new Error(`Failed to delete vectors: ${error.message}`);
    }
  }

  /**
   * Get index statistics
   */
  async getStats(): Promise<any> {
    try {
      const response = await this.client.get(
        `/indexes/${this.config.indexName}/stats`,
      );
      return response.data;
    } catch (error) {
      this.logger.error('Error getting CyborgDB stats', error.stack);
      throw new Error(`Failed to get stats: ${error.message}`);
    }
  }

  /**
   * Health check for CyborgDB connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch (error) {
      this.logger.error('CyborgDB health check failed', error.stack);
      return false;
    }
  }
}

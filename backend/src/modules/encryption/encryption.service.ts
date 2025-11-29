import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Encryption Service for vector embeddings
 * Uses AES-256-GCM for authenticated encryption
 * 
 * Security Notes:
 * - Encryption key must be 256 bits (32 bytes)
 * - IV (initialization vector) is randomly generated for each encryption
 * - Auth tag provides integrity verification
 * - Decryption only happens in-memory, never persisted
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm: string;
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    this.algorithm = this.configService.get<string>('encryption.algorithm');
    const keyHex = this.configService.get<string>('encryption.key');

    if (!keyHex || keyHex.length !== 64) {
      throw new Error(
        'Encryption key must be 256 bits (64 hex characters). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
      );
    }

    this.key = Buffer.from(keyHex, 'hex');
    this.logger.log('Encryption service initialized with AES-256-GCM');
  }

  /**
   * Encrypt a vector embedding
   * Returns encrypted data as base64 string with IV and auth tag
   */
  encryptVector(vector: number[]): string {
    try {
      // Generate random IV (12 bytes for GCM)
      const iv = crypto.randomBytes(12);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv) as crypto.CipherGCM;

      // Convert vector to buffer
      const vectorBuffer = Buffer.from(JSON.stringify(vector));

      // Encrypt
      const encrypted = Buffer.concat([
        cipher.update(vectorBuffer),
        cipher.final(),
      ]);

      // Get auth tag
      const authTag = cipher.getAuthTag();

      // Combine IV + authTag + encrypted data
      const combined = Buffer.concat([iv, authTag, encrypted]);

      // Return as base64
      return combined.toString('base64');
    } catch (error) {
      this.logger.error('Vector encryption failed', error.stack);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt a vector embedding
   * IMPORTANT: Decrypted data should only exist in memory, never persisted
   */
  decryptVector(encryptedData: string): number[] {
    try {
      // Decode from base64
      const combined = Buffer.from(encryptedData, 'base64');

      // Extract IV (first 12 bytes)
      const iv = combined.slice(0, 12);

      // Extract auth tag (next 16 bytes)
      const authTag = combined.slice(12, 28);

      // Extract encrypted data (remaining bytes)
      const encrypted = combined.slice(28);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv) as crypto.DecipherGCM;
      decipher.setAuthTag(authTag);

      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      // Parse JSON back to array
      return JSON.parse(decrypted.toString());
    } catch (error) {
      this.logger.error('Vector decryption failed', error.stack);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt arbitrary data
   */
  encrypt(data: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv) as crypto.CipherGCM;
    
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final(),
    ]);
    
    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, authTag, encrypted]);
    
    return combined.toString('base64');
  }

  /**
   * Decrypt arbitrary data
   */
  decrypt(encryptedData: string): string {
    const combined = Buffer.from(encryptedData, 'base64');
    const iv = combined.slice(0, 12);
    const authTag = combined.slice(12, 28);
    const encrypted = combined.slice(28);
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    
    return decrypted.toString('utf8');
  }

  /**
   * Generate a hash for data integrity checks
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CyborgDbService } from '../src/modules/cyborgdb/cyborgdb.service';
import { EncryptionService } from '../src/modules/encryption/encryption.service';
import { ConfigModule } from '@nestjs/config';
import configuration from '../src/config/configuration';

describe('CyborgDB Integration Tests', () => {
  let app: INestApplication;
  let cyborgDbService: CyborgDbService;
  let encryptionService: EncryptionService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [configuration],
        }),
      ],
      providers: [CyborgDbService, EncryptionService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    cyborgDbService = moduleFixture.get<CyborgDbService>(CyborgDbService);
    encryptionService = moduleFixture.get<EncryptionService>(EncryptionService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Encrypted Vector Operations', () => {
    const testVectorId = 'test-vector-1';
    const testVector = Array.from({ length: 1536 }, () => Math.random());

    it('should encrypt and store a vector', async () => {
      const encryptedVector = encryptionService.encryptVector(testVector);
      expect(encryptedVector).toBeDefined();
      expect(typeof encryptedVector).toBe('string');

      await expect(
        cyborgDbService.upsert([
          {
            id: testVectorId,
            vector: testVector,
            metadata: {
              encrypted: true,
              testData: true,
            },
          },
        ]),
      ).resolves.not.toThrow();
    });

    it('should decrypt a vector correctly', () => {
      const encrypted = encryptionService.encryptVector(testVector);
      const decrypted = encryptionService.decryptVector(encrypted);

      expect(decrypted).toHaveLength(testVector.length);
      
      // Check values are approximately equal (floating point issues)
      for (let i = 0; i < testVector.length; i++) {
        expect(Math.abs(decrypted[i] - testVector[i])).toBeLessThan(0.0001);
      }
    });

    it('should perform similarity search', async () => {
      const queryVector = Array.from({ length: 1536 }, () => Math.random());

      const results = await cyborgDbService.query(queryVector, 5);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should delete vectors', async () => {
      await expect(
        cyborgDbService.delete([testVectorId]),
      ).resolves.not.toThrow();
    });
  });

  describe('Encryption Security', () => {
    it('should generate different encrypted outputs for same input', () => {
      const vector = [1, 2, 3, 4, 5];
      const encrypted1 = encryptionService.encryptVector(vector);
      const encrypted2 = encryptionService.encryptVector(vector);

      // Different due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same value
      const decrypted1 = encryptionService.decryptVector(encrypted1);
      const decrypted2 = encryptionService.decryptVector(encrypted2);

      expect(decrypted1).toEqual(vector);
      expect(decrypted2).toEqual(vector);
    });

    it('should fail to decrypt with tampered data', () => {
      const vector = [1, 2, 3];
      const encrypted = encryptionService.encryptVector(vector);

      // Tamper with encrypted data
      const tampered = encrypted.slice(0, -5) + 'XXXXX';

      expect(() => {
        encryptionService.decryptVector(tampered);
      }).toThrow();
    });
  });
});

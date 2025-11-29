import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicalRecord } from './entities/medical-record.entity';
import { CreateMedicalRecordDto } from './dto/create-record.dto';
import { AuditService } from '../logs/audit.service';
import { RagService } from '../rag/rag.service';

@Injectable()
export class MedicalRecordsService {
  constructor(
    @InjectRepository(MedicalRecord)
    private medicalRecordRepository: Repository<MedicalRecord>,
    private auditService: AuditService,
    private ragService: RagService,
  ) {}

  /**
   * Create a medical record and process it through the RAG pipeline
   */
  async create(
    createDto: CreateMedicalRecordDto,
    userId: string,
  ): Promise<MedicalRecord> {
    // Create record
    const record = this.medicalRecordRepository.create({
      ...createDto,
      doctorId: userId,
      recordDate: createDto.recordDate
        ? new Date(createDto.recordDate)
        : new Date(),
    });

    await this.medicalRecordRepository.save(record);

    // Log creation
    await this.auditService.log({
      action: 'MEDICAL_RECORD_CREATED',
      userId,
      resourceType: 'medical_record',
      resourceId: record.id,
      details: {
        patientId: record.patientId,
        recordType: record.recordType,
      },
    });

    // Process through RAG pipeline (async)
    this.processRecordAsync(record, userId);

    return record;
  }

  /**
   * Process record through RAG pipeline (chunk, embed, encrypt, store)
   */
  private async processRecordAsync(
    record: MedicalRecord,
    userId: string,
  ): Promise<void> {
    try {
      const chunkIds = await this.ragService.ingestDocument({
        id: record.id,
        content: record.content,
        metadata: {
          recordType: record.recordType,
          patientId: record.patientId,
          patientName: record.patientName,
          diagnosis: record.diagnosis,
          recordDate: record.recordDate,
        },
      });

      // Update record with encrypted chunk references
      record.encryptedChunks = chunkIds;
      record.isEncrypted = true;
      await this.medicalRecordRepository.save(record);

      await this.auditService.log({
        action: 'MEDICAL_RECORD_ENCRYPTED',
        userId,
        resourceType: 'medical_record',
        resourceId: record.id,
        details: { chunkCount: chunkIds.length },
      });
    } catch (error) {
      console.error('Failed to process record through RAG:', error);
    }
  }

  /**
   * Find all medical records (with pagination)
   */
  async findAll(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ records: MedicalRecord[]; total: number }> {
    const [records, total] = await this.medicalRecordRepository.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      order: { createdAt: 'DESC' },
    });

    // Log access
    await this.auditService.log({
      action: 'MEDICAL_RECORDS_VIEWED',
      userId,
      details: { page, limit, total },
    });

    return { records, total };
  }

  /**
   * Find medical record by ID
   */
  async findOne(id: string, userId: string): Promise<MedicalRecord> {
    const record = await this.medicalRecordRepository.findOne({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException(`Medical record with ID ${id} not found`);
    }

    // Log access
    await this.auditService.log({
      action: 'MEDICAL_RECORD_ACCESSED',
      userId,
      resourceType: 'medical_record',
      resourceId: id,
      details: { patientId: record.patientId },
    });

    return record;
  }

  /**
   * Find records by patient ID
   */
  async findByPatient(
    patientId: string,
    userId: string,
  ): Promise<MedicalRecord[]> {
    const records = await this.medicalRecordRepository.find({
      where: { patientId },
      order: { recordDate: 'DESC' },
    });

    await this.auditService.log({
      action: 'PATIENT_RECORDS_ACCESSED',
      userId,
      details: { patientId, count: records.length },
    });

    return records;
  }

  /**
   * Delete a medical record and its encrypted vectors
   */
  async remove(id: string, userId: string): Promise<void> {
    const record = await this.findOne(id, userId);

    // Delete encrypted vectors from CyborgDB
    if (record.encryptedChunks && record.encryptedChunks.length > 0) {
      await this.ragService.deleteDocument(record.encryptedChunks);
    }

    await this.medicalRecordRepository.remove(record);

    await this.auditService.log({
      action: 'MEDICAL_RECORD_DELETED',
      userId,
      resourceType: 'medical_record',
      resourceId: id,
      details: { patientId: record.patientId },
    });
  }
}

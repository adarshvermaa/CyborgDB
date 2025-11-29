import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('medical_records')
export class MedicalRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @Column()
  patientName: string;

  @Column()
  recordType: string; // e.g., 'clinical_note', 'lab_result', 'prescription'

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  diagnosis: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  doctorId: string;

  @Column({ nullable: true })
  facilityId: string;

  @Column({ default: false })
  isEncrypted: boolean;

  @Column({ type: 'jsonb', nullable: true })
  encryptedChunks: string[]; // References to encrypted vectors in CyborgDB

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  recordDate: Date;
}

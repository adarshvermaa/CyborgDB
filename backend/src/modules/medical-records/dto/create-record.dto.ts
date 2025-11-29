import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMedicalRecordDto {
  @ApiProperty({ example: 'P12345' })
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  patientName: string;

  @ApiProperty({ example: 'clinical_note' })
  @IsString()
  @IsNotEmpty()
  recordType: string;

  @ApiProperty({
    example: 'Patient presents with acute respiratory symptoms...',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ example: 'Upper respiratory tract infection' })
  @IsString()
  @IsOptional()
  diagnosis?: string;

  @ApiPropertyOptional({ example: { severity: 'moderate', department: 'ER' } })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  recordDate?: string;
}

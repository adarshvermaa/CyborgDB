import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { MedicalRecordsService } from './medical-records.service';
import { CreateMedicalRecordDto } from './dto/create-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('medical-records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private medicalRecordsService: MedicalRecordsService) {}

  @Post()
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a medical record' })
  @ApiResponse({ status: 201, description: 'Record created successfully' })
  create(@Body() createDto: CreateMedicalRecordDto, @Request() req) {
    return this.medicalRecordsService.create(createDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all medical records' })
  @ApiResponse({ status: 200, description: 'Records retrieved successfully' })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Request() req,
  ) {
    return this.medicalRecordsService.findAll(req.user.userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a medical record by ID' })
  @ApiResponse({ status: 200, description: 'Record retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.medicalRecordsService.findOne(id, req.user.userId);
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get all records for a patient' })
  @ApiResponse({ status: 200, description: 'Records retrieved successfully' })
  findByPatient(@Param('patientId') patientId: string, @Request() req) {
    return this.medicalRecordsService.findByPatient(
      patientId,
      req.user.userId,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a medical record' })
  @ApiResponse({ status: 200, description: 'Record deleted successfully' })
  remove(@Param('id') id: string, @Request() req) {
    return this.medicalRecordsService.remove(id, req.user.userId);
  }
}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';

// Module imports
import { AuthModule } from './modules/auth/auth.module';
import { CyborgDbModule } from './modules/cyborgdb/cyborgdb.module';
import { EncryptionModule } from './modules/encryption/encryption.module';
import { EmbeddingsModule } from './modules/embeddings/embeddings.module';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { RagModule } from './modules/rag/rag.module';
import { ChatModule } from './modules/chat/chat.module';
import { LogsModule } from './modules/logs/logs.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('database.synchronize'),
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    AuthModule,
    CyborgDbModule,
    EncryptionModule,
    EmbeddingsModule,
    MedicalRecordsModule,
    RagModule,
    ChatModule,
    LogsModule,
  ],
})
export class AppModule {}

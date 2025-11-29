# Encrypted Medical RAG AI - Architecture

## System Overview

This application demonstrates a production-ready implementation of encrypted vector search for medical AI applications using CyborgDB. It prevents vector inversion attacks while maintaining the ability to perform similarity search on sensitive medical data.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  React Frontend (Vite + TypeScript + TailwindCSS)       │   │
│  │  - Authentication UI                                     │   │
│  │  - Chat Interface (WebSocket)                            │   │
│  │  - Medical Records Dashboard                             │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS / WSS
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      Application Layer                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  NestJS Backend                                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │ Auth Module  │  │  RAG Module  │  │ Chat Module  │  │   │
│  │  │  - JWT       │  │  - Chunking  │  │  - WebSocket │  │   │
│  │  │  - RBAC      │  │  - Embedding │  │  - Streaming │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  │                                                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │ Encryption   │  │  Embeddings  │  │   Medical    │  │   │
│  │  │   Service    │  │   Service    │  │   Records    │  │   │
│  │  │ AES-256-GCM  │  │ OpenAI/Ollama│  │   Service    │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
┌───────────────▼──────┐   ┌──────────────▼──────────────┐
│   PostgreSQL DB      │   │  CyborgDB                   │
│  - User Data         │   │  Encrypted Vector Store     │
│  - Medical Records   │   │  - Encrypted Embeddings     │
│  - Audit Logs        │   │  - Similarity Search        │
│  - Metadata          │   │  - Cosine Distance          │
└──────────────────────┘   └─────────────────────────────┘
```

## Data Flow: Document Ingestion

```
Medical Document
      │
      ▼
┌─────────────┐
│   Chunking  │ Split into 500-char chunks with 50-char overlap
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Embedding  │ Generate 1536-dim vectors (OpenAI/Ollama)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Encryption  │ AES-256-GCM with random IV per vector
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  CyborgDB   │ Store encrypted vectors with metadata
└─────────────┘
```

## Data Flow: Query Processing

```
User Query
    │
    ▼
┌────────────┐
│ Embedding  │ Generate query vector
└─────┬──────┘
      │
      ▼
┌────────────┐
│ Encrypt    │ Encrypt query vector
└─────┬──────┘
      │
      ▼
┌────────────┐
│ CyborgDB   │ Similarity search (encrypted)
│   Query    │ Returns top-K matches
└─────┬──────┘
      │
      ▼
┌────────────┐
│  Decrypt   │ IN-MEMORY ONLY - never persisted
└─────┬──────┘
      │
      ▼
┌────────────┐
│  Context   │ Assemble context for LLM
│ Assembly   │
└─────┬──────┘
      │
      ▼
┌────────────┐
│    LLM     │ Generate response
│  Response  │
└────────────┘
```

## Security Model

### Encryption in Use

1. **At Rest**: All embeddings encrypted with AES-256-GCM before storage
2. **In Transit**: HTTPS/WSS for all network communication
3. **In Memory**: Decryption ONLY happens in-memory during query processing
4. **Key Management**: 256-bit encryption key from environment (should use KMS in production)

### HIPAA Compliance

- ✅ **Access Control**: Role-based access (admin, doctor, user)
- ✅ **Audit Logging**: All data access logged with timestamps and user info
- ✅ **Encryption**: End-to-end encryption for sensitive data
- ✅ **Data Integrity**: Auth tags validate data hasn't been tampered
- ✅ **Minimum Necessary**: Only retrieve relevant chunks, not entire records

### Threat Model

**Prevented Attacks:**
- ✅ Vector inversion attacks (embeddings are encrypted)
- ✅ Unauthorized data access (JWT + RBAC)
- ✅ Data tampering (GCM auth tags)
- ✅ Man-in-the-middle (HTTPS/WSS)

**Residual Risks:**
- ⚠️ Inference attacks from query patterns (mitigate with rate limiting)
- ⚠️ Timing attacks (constant-time operations needed in production)
- ⚠️ Key compromise (use HSM/KMS in production)

## Module Breakdown

### Backend Modules

1. **Auth Module** (`src/modules/auth/`)
   - JWT-based authentication
   - Role-based access control (RBAC)
   - User management

2. **Encryption Module** (`src/modules/encryption/`)
   - AES-256-GCM encryption/decryption
   - Secure key derivation
   - In-memory-only decryption

3. **CyborgDB Module** (`src/modules/cyborgdb/`)
   - Connection management
   - Vector upsert operations
   - Similarity search queries
   - Health checks

4. **Embeddings Module** (`src/modules/embeddings/`)
   - OpenAI integration
   - Ollama integration
   - Batch processing

5. **RAG Module** (`src/modules/rag/`)
   - Document chunking
   - Pipeline orchestration
   - Context assembly

6. **Chat Module** (`src/modules/chat/`)
   - WebSocket gateway
   - Streaming responses
   - Chat history management

7. **Medical Records Module** (`src/modules/medical-records/`)
   - CRUD operations
   - Integration with RAG pipeline
   - HIPAA-compliant storage

8. **Logs Module** (`src/modules/logs/`)
   - Audit logging
   - Access tracking
   - Compliance reporting

### Frontend Components

1. **Authentication** (`src/pages/Login.tsx`, `src/pages/Register.tsx`)
   - Login/register forms
   - Token management

2. **Dashboard** (`src/pages/Dashboard.tsx`)
   - Statistics overview
   - Quick actions
   - Security status

3. **Chat Interface** (`src/components/Chat/ChatBox.tsx`)
   - Real-time messaging
   - Streaming responses
   - Source attribution

## Performance Characteristics

### Target Metrics

- Query Latency (P95): < 100ms
- Throughput: > 100 queries/second
- Embedding Generation: ~50ms per document chunk
- Encryption Overhead: < 10ms per vector

### Optimization Strategies

1. **Batch Processing**: Process multiple embeddings concurrently
2. **Connection Pooling**: Reuse database and API connections
3. **Caching**: Cache frequently accessed embeddings (encrypted)
4. **Streaming**: Use WebSocket streaming for better UX

## Deployment Considerations

### Production Checklist

- [ ] Replace demo encryption key with HSM/KMS
- [ ] Enable HTTPS with valid certificates
- [ ] Set up log aggregation (ELK, Datadog)
- [ ] Configure backup and disaster recovery
- [ ] Implement rate limiting and DDoS protection
- [ ] Set up monitoring and alerting
- [ ] Conduct security audit
- [ ] Implement key rotation strategy
- [ ] Configure horizontal scaling
- [ ] Set up CI/CD pipeline

### Scaling Strategy

- **Horizontal**: Multiple backend instances behind load balancer
- **Database**: PostgreSQL read replicas for queries
- **Vector Store**: CyborgDB handles scalability internally
- **Caching**: Redis for session management and caching

## Monitoring

### Key Metrics

- Query latency percentiles (p50, p95, p99)
- Throughput (queries per second)
- Error rates
- Memory usage
- Database connection pool usage
- CyborgDB response times
- Encryption/decryption overhead

### Alerting

- High error rates (> 1%)
- Slow queries (p95 > 200ms)
- Memory exhaustion
- Database connection issues
- CyborgDB unavailability

## Future Enhancements

1. **Multi-tenancy**: Cryptographic tenant isolation
2. **Advanced RAG**: Hybrid dense+sparse retrieval
3. **Fine-tuning**: Custom medical language models
4. **Advanced Analytics**: Query pattern analysis
5. **Mobile Apps**: Native iOS/Android clients
6. **Federation**: Multi-facility deployment

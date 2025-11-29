export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'encrypted_medical_rag',
    synchronize: process.env.DATABASE_SYNC === 'true',
  },

  cyborgdb: {
    apiUrl: process.env.CYBORGDB_API_URL,
    apiKey: process.env.CYBORGDB_API_KEY,
    indexName: process.env.CYBORGDB_INDEX_NAME || 'medical-embeddings',
    dimension: parseInt(process.env.CYBORGDB_DIMENSION, 10) || 1536,
    metric: process.env.CYBORGDB_METRIC || 'cosine',
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY,
    algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRATION || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },

  embeddings: {
    provider: process.env.EMBEDDING_PROVIDER || 'openai',
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      chatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4-turbo-preview',
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
      chatModel: process.env.OLLAMA_CHAT_MODEL || 'llama2',
    },
  },

  rag: {
    chunkSize: parseInt(process.env.CHUNK_SIZE, 10) || 500,
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP, 10) || 50,
    maxContextChunks: parseInt(process.env.MAX_CONTEXT_CHUNKS, 10) || 5,
    similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.7,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },

  performance: {
    maxConcurrentEmbeddings: parseInt(process.env.MAX_CONCURRENT_EMBEDDINGS, 10) || 10,
    cacheTtl: parseInt(process.env.CACHE_TTL, 10) || 3600,
  },
});

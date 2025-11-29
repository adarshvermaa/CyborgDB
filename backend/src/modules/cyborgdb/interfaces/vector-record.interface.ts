export interface VectorRecord {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
}

export interface QueryResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
}

export interface CyborgDbConfig {
  apiUrl: string;
  apiKey: string;
  indexName: string;
  dimension: number;
  metric: string;
}

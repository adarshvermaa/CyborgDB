import axios from 'axios';
import * as fs from 'fs';

interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
  throughput: number;
}

interface PerformanceReport {
  timestamp: string;
  datasetSize: number;
  results: BenchmarkResult[];
  summary: {
    totalQueries: number;
    totalTime: number;
    overallThroughput: number;
  };
}

class VectorSearchBenchmark {
  private apiUrl: string;
  private authToken: string = '';

  constructor() {
    this.apiUrl = process.env.API_URL || 'http://localhost:3000/api';
  }

  async authenticate(): Promise<void> {
    console.log('Authenticating...');
    
    try {
      const response = await axios.post(`${this.apiUrl}/auth/login`, {
        email: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'password123',
      });

      this.authToken = response.data.accessToken;
      console.log('✓ Authentication successful');
    } catch (error) {
      const err = error as Error;
      console.error('Authentication failed:', err.message);
      throw error;
    }
  }

  async benchmarkVectorQuery(iterations: number): Promise<BenchmarkResult> {
    console.log(`\nBenchmarking vector queries (${iterations} iterations)...`);
    
    const times: number[] = [];
    const testQuery = 'What are the patient symptoms?';

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      
      try {
        await axios.post(
          `${this.apiUrl}/chat/message`,
          { message: testQuery },
          {
            headers: { Authorization: `Bearer ${this.authToken}` },
          },
        );
      } catch (error) {
        const err = error as Error;
        console.warn(`Query ${i + 1} failed:`, err.message);
      }

      const elapsed = Date.now() - start;
      times.push(elapsed);

      if ((i + 1) % 10 === 0) {
        process.stdout.write(`\r  Progress: ${i + 1}/${iterations}`);
      }
    }

    process.stdout.write('\n');

    return this.calculateStats('Vector Query', times);
  }

  async benchmarkEmbeddingGeneration(iterations: number): Promise<BenchmarkResult> {
    console.log(`\nBenchmarking embedding generation (${iterations} iterations)...`);
    
    const times: number[] = [];
    const testTexts = [
      'Patient presents with fever and cough',
      'Blood pressure reading 120/80',
      'Prescription: Amoxicillin 500mg',
    ];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      
      try {
        await axios.post(
          `${this.apiUrl}/medical-records`,
          {
            patientId: `TEST-${i}`,
            patientName: `Test Patient ${i}`,
            recordType: 'clinical_note',
            content: testTexts[i % testTexts.length],
          },
          {
            headers: { Authorization: `Bearer ${this.authToken}` },
          },
        );
      } catch (error) {
        // Ignore errors for benchmark
      }

      const elapsed = Date.now() - start;
      times.push(elapsed);

      if ((i + 1) % 10 === 0) {
        process.stdout.write(`\r  Progress: ${i + 1}/${iterations}`);
      }
    }

    process.stdout.write('\n');

    return this.calculateStats('Embedding + Encryption', times);
  }

  calculateStats(operation: string, times: number[]): BenchmarkResult {
    const sorted = times.sort((a, b) => a - b);
    const total = times.reduce((sum, t) => sum + t, 0);

    return {
      operation,
      iterations: times.length,
      totalTime: total,
      averageTime: total / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      throughput: (times.length / total) * 1000, // queries per second
    };
  }

  printResults(result: BenchmarkResult): void {
    console.log(`\n📊 ${result.operation} Results:`);
    console.log(`  Iterations: ${result.iterations}`);
    console.log(`  Total Time: ${result.totalTime.toFixed(2)}ms`);
    console.log(`  Average: ${result.averageTime.toFixed(2)}ms`);
    console.log(`  Min: ${result.minTime.toFixed(2)}ms`);
    console.log(`  Max: ${result.maxTime.toFixed(2)}ms`);
    console.log(`  P50: ${result.p50.toFixed(2)}ms`);
    console.log(`  P95: ${result.p95.toFixed(2)}ms`);
    console.log(`  P99: ${result.p99.toFixed(2)}ms`);
    console.log(`  Throughput: ${result.throughput.toFixed(2)} ops/sec`);
  }

  async run(): Promise<void> {
    console.log('=================================');
    console.log('  ENCRYPTED VECTOR SEARCH BENCHMARK');
    console.log('=================================\n');

    try {
      await this.authenticate();

      const results: BenchmarkResult[] = [];

      // Benchmark 1: Vector queries
      const queryResult = await this.benchmarkVectorQuery(50);
      this.printResults(queryResult);
      results.push(queryResult);

      // Benchmark 2: Embedding generation with encryption
      const embeddingResult = await this.benchmarkEmbeddingGeneration(20);
      this.printResults(embeddingResult);
      results.push(embeddingResult);

      // Generate report
      const totalQueries = results.reduce((sum, r) => sum + r.iterations, 0);
      const totalTime = results.reduce((sum, r) => sum + r.totalTime, 0);

      const report: PerformanceReport = {
        timestamp: new Date().toISOString(),
        datasetSize: 0, // Update based on your test data
        results,
        summary: {
          totalQueries,
          totalTime,
          overallThroughput: (totalQueries / totalTime) * 1000,
        },
      };

      // Save report
      const reportPath = './performance-report.json';
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      console.log(`\n✓ Performance report saved to: ${reportPath}`);
      console.log(`\n📈 Summary:`);
      console.log(`  Total Queries: ${totalQueries}`);
      console.log(`  Total Time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Overall Throughput: ${report.summary.overallThroughput.toFixed(2)} ops/sec`);

      // Evaluate against targets
      console.log(`\n🎯 Target Evaluation:`);
      const queryP95 = queryResult.p95;
      console.log(`  Query Latency (P95): ${queryP95.toFixed(2)}ms ${queryP95 < 100 ? '✓' : '✗'} (target: <100ms)`);
      console.log(`  Throughput: ${report.summary.overallThroughput.toFixed(2)} ops/sec ${report.summary.overallThroughput > 10 ? '✓' : '✗'} (target: >10 ops/sec)`);

    } catch (error) {
      const err = error as Error;
      console.error('\n❌ Benchmark failed:', err.message);
      process.exit(1);
    }
  }
}

// Run benchmark
const benchmark = new VectorSearchBenchmark();
benchmark.run();

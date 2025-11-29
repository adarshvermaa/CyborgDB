import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import axios from 'axios';
import { RagService } from '../rag/rag.service';
import { AuditService } from '../logs/audit.service';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: string;
  context?: string[];
  sources?: any[];
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly provider: string;
  private openaiClient?: OpenAI;
  private ollamaBaseUrl?: string;
  private chatModel: string;

  constructor(
    private configService: ConfigService,
    private ragService: RagService,
    private auditService: AuditService,
  ) {
    this.provider = this.configService.get<string>('embeddings.provider');

    if (this.provider === 'openai') {
      const apiKey = this.configService.get<string>('embeddings.openai.apiKey');
      this.chatModel = this.configService.get<string>('embeddings.openai.chatModel');
      
      if (apiKey) {
        this.openaiClient = new OpenAI({ apiKey });
      }
    } else {
      this.ollamaBaseUrl = this.configService.get<string>('embeddings.ollama.baseUrl');
      this.chatModel = this.configService.get<string>('embeddings.ollama.chatModel');
    }
  }

  /**
   * Process a chat message with RAG context
   */
  async chat(
    userMessage: string,
    userId: string,
    history: ChatMessage[] = [],
  ): Promise<ChatResponse> {
    this.logger.debug(`Processing chat for user ${userId}`);

    try {
      // Step 1: Retrieve relevant context using RAG
      const retrievalResults = await this.ragService.retrieve(userMessage);
      const context = this.ragService.assembleContext(retrievalResults);

      // Step 2: Build messages with context
      const systemMessage: ChatMessage = {
        role: 'system',
        content: `You are a helpful medical assistant. Use the following context from medical records to answer the user's question. If the context doesn't contain relevant information, say so.

Context:
${context}

Rules:
- Only use information from the provided context
- Be accurate and concise
- If uncertain, acknowledge limitations
- Maintain patient confidentiality`,
      };

      const messages: ChatMessage[] = [
        systemMessage,
        ...history.slice(-5), // Last 5 messages for context
        { role: 'user', content: userMessage },
      ];

      // Step 3: Generate response
      let response: string;
      
      if (this.provider === 'openai' && this.openaiClient) {
        response = await this.generateOpenAIResponse(messages);
      } else {
        response = await this.generateOllamaResponse(messages);
      }

      // Step 4: Log interaction
      await this.auditService.log({
        action: 'CHAT_MESSAGE',
        userId,
        details: {
          query: userMessage.substring(0, 100),
          contextChunks: retrievalResults.length,
          responseLength: response.length,
        },
      });

      return {
        message: response,
        context: retrievalResults.map((r) => r.content),
        sources: retrievalResults.map((r) => ({
          id: r.id,
          score: r.score,
          metadata: r.metadata,
        })),
      };
    } catch (error) {
      this.logger.error('Chat processing failed', error.stack);
      throw new Error(`Chat failed: ${error.message}`);
    }
  }

  /**
   * Stream chat response (for real-time UX)
   */
  async *streamChat(
    userMessage: string,
    userId: string,
    history: ChatMessage[] = [],
  ): AsyncGenerator<string> {
    this.logger.debug(`Streaming chat for user ${userId}`);

    try {
      // Retrieve context
      const retrievalResults = await this.ragService.retrieve(userMessage);
      const context = this.ragService.assembleContext(retrievalResults);

      const systemMessage: ChatMessage = {
        role: 'system',
        content: `You are a helpful medical assistant. Use the following context to answer questions.

Context:
${context}`,
      };

      const messages: ChatMessage[] = [
        systemMessage,
        ...history.slice(-5),
        { role: 'user', content: userMessage },
      ];

      if (this.provider === 'openai' && this.openaiClient) {
        // OpenAI streaming
        const stream = await this.openaiClient.chat.completions.create({
          model: this.chatModel,
          messages: messages as any,
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            yield content;
          }
        }
      } else {
        // Ollama streaming
        const response = await axios.post(
          `${this.ollamaBaseUrl}/api/chat`,
          {
            model: this.chatModel,
            messages,
            stream: true,
          },
          { responseType: 'stream' },
        );

        for await (const chunk of response.data) {
          const data = JSON.parse(chunk.toString());
          if (data.message?.content) {
            yield data.message.content;
          }
        }
      }

      // Log interaction
      await this.auditService.log({
        action: 'CHAT_STREAM',
        userId,
        details: {
          query: userMessage.substring(0, 100),
          contextChunks: retrievalResults.length,
        },
      });
    } catch (error) {
      this.logger.error('Chat streaming failed', error.stack);
      throw error;
    }
  }

  /**
   * Generate OpenAI response
   */
  private async generateOpenAIResponse(messages: ChatMessage[]): Promise<string> {
    const completion = await this.openaiClient.chat.completions.create({
      model: this.chatModel,
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 1000,
    });

    return completion.choices[0].message.content;
  }

  /**
   * Generate Ollama response
   */
  private async generateOllamaResponse(messages: ChatMessage[]): Promise<string> {
    const response = await axios.post(`${this.ollamaBaseUrl}/api/chat`, {
      model: this.chatModel,
      messages,
      stream: false,
    });

    return response.data.message.content;
  }
}

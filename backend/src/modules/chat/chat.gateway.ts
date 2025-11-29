import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { ChatService, ChatMessage } from './chat.service';
import { Logger } from '@nestjs/common';

/**
 * WebSocket Gateway for real-time chat
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:message')
  async handleMessage(
    @MessageBody() data: { message: string; userId: string; history?: ChatMessage[] },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.debug(`Received message from ${data.userId}`);

      // Non-streaming response
      const response = await this.chatService.chat(
        data.message,
        data.userId,
        data.history || [],
      );

      client.emit('chat:response', response);
    } catch (error) {
      this.logger.error('Chat message handling failed', error.stack);
      client.emit('chat:error', { message: error.message });
    }
  }

  @SubscribeMessage('chat:stream')
  async handleStreamMessage(
    @MessageBody() data: { message: string; userId: string; history?: ChatMessage[] },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.debug(`Streaming message from ${data.userId}`);

      // Stream response
      const stream = this.chatService.streamChat(
        data.message,
        data.userId,
        data.history || [],
      );

      for await (const chunk of stream) {
        client.emit('chat:stream:chunk', { chunk });
      }

      client.emit('chat:stream:end', { done: true });
    } catch (error) {
      this.logger.error('Chat streaming failed', error.stack);
      client.emit('chat:error', { message: error.message });
    }
  }
}

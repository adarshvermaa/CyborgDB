import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('message')
  @ApiOperation({ summary: 'Send a chat message' })
  @ApiResponse({ status: 200, description: 'Chat response returned' })
  async sendMessage(
    @Body() body: { message: string; history?: any[] },
    @Request() req,
  ) {
    return this.chatService.chat(body.message, req.user.userId, body.history);
  }
}

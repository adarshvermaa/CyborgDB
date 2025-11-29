import React, { useState, useEffect, useRef } from 'react';
import { socketService } from '../../services/socket.service';
import { Send, Loader2, Shield } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
}

export const ChatBox: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userId = 'user-id'; // This would come from auth context

  useEffect(() => {
    const socket = socketService.connect();

    socket.on('chat:response', (response: any) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.message, sources: response.sources },
      ]);
      setLoading(false);
    });

    socket.on('chat:stream:chunk', (data: { chunk: string }) => {
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && streaming) {
          return [
            ...prev.slice(0, -1),
            { ...lastMessage, content: lastMessage.content + data.chunk },
          ];
        } else {
          return [...prev, { role: 'assistant', content: data.chunk }];
        }
      });
    });

    socket.on('chat:stream:end', () => {
      setStreaming(false);
      setLoading(false);
    });

    socket.on('chat:error', (error: { message: string }) => {
      console.error('Chat error:', error);
      setLoading(false);
      setStreaming(false);
    });

    return () => {
      socket.off('chat:response');
      socket.off('chat:stream:chunk');
      socket.off('chat:stream:end');
      socket.off('chat:error');
    };
  }, [streaming]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const newMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput('');
    setLoading(true);
    setStreaming(true);

    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('chat:stream', {
        message: input,
        userId,
        history: messages.slice(-10),
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Medical AI Assistant</h2>
            <p className="text-sm text-gray-500">Encrypted RAG-powered responses</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Start a secure conversation</p>
            <p className="text-sm">
              Ask questions about medical records with end-to-end encrypted vector search
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-900 shadow-sm border border-gray-100'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
                    <div className="font-medium mb-1">Sources ({msg.sources.length}):</div>
                    {msg.sources.map((source, i) => (
                      <div key={i} className="truncate">
                        • {source.metadata?.recordType || 'Medical Record'} (relevance: {(source.score * 100).toFixed(1)}%)
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
              <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about patient records..."
            className="flex-1 input"
            disabled={loading}
          />
          <button
            type="submit"
            className="btn btn-primary flex items-center gap-2"
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

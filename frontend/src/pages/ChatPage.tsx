import React from 'react';
import { ChatBox } from '../components/Chat/ChatBox';

export const ChatPage: React.FC = () => {
  return (
    <div className="h-screen flex flex-col">
      <ChatBox />
    </div>
  );
};

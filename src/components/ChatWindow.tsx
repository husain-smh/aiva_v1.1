'use client';

import { FC, useEffect, useRef } from 'react';
import Message from './Message';
import ChatInput from './ChatInput';

export interface MessageType {
  _id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ChatWindowProps {
  messages: MessageType[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
}

const ChatWindow: FC<ChatWindowProps> = ({
  messages,
  isLoading,
  onSendMessage,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Start a conversation with the assistant.</p>
          </div>
        ) : (
          messages.map((message) => (
            <Message
              key={message._id}
              role={message.role}
              content={message.content}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSubmit={onSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default ChatWindow; 
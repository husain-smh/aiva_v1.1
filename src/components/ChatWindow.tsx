'use client';

import { FC, useEffect, useRef, useState } from 'react';
import Message from './Message';
import ChatInput from './ChatInput';
import { GlassCard } from './ui/GlassCard';
import { NeonButton } from './ui/NeonButton';
import { Copy } from 'lucide-react';

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
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      // handle error
    }
  };

  return (
    <GlassCard className="flex flex-col gap-4 h-full">
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Start a conversation with the assistant.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div
                className={`relative p-3 rounded-lg text-sm break-words whitespace-pre-wrap ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-[oklch(0.85_0.01_285)]'} min-w-[40px] max-w-[90%]`}
                style={{ boxShadow: 'none' }}
              >
                {msg.content}
                {hoveredIdx === idx && (
                  <button
                    onClick={() => handleCopy(msg.content)}
                    className="absolute top-2 right-2 p-1 rounded-md hover:bg-primary/20 transition-opacity"
                    title="Copy to clipboard"
                  >
                    <Copy size={14} className="opacity-70" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={e => {
          e.preventDefault();
          const input = e.target.elements.message.value;
          if (input) onSendMessage(input);
          e.target.reset();
        }}
        className="flex gap-2 items-center"
      >
        <input
          name="message"
          className="flex-1 bg-input text-foreground rounded-lg px-4 py-2 border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          placeholder="Type your message..."
          autoComplete="off"
        />
        <NeonButton type="submit">Send</NeonButton>
      </form>
    </GlassCard>
  );
};

export default ChatWindow; 
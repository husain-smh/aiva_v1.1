'use client';

import { FC, FormEvent, useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from './ui/button';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
}

const ChatInput: FC<ChatInputProps> = ({ onSubmit, isLoading }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isLoading) return;
    
    onSubmit(message);
    setMessage('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center border-t border-border p-4"
    >
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        className="flex-1 border border-input rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
        disabled={isLoading}
      />
      <Button
        type="submit"
        className="rounded-l-none rounded-r-lg"
        disabled={isLoading || !message.trim()}
      >
        {isLoading ? (
          <div className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <Send size={18} />
        )}
      </Button>
    </form>
  );
};

export default ChatInput; 
'use client';

import { FC, useState, useCallback, useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { MessageType } from '@/types/chat';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Send } from 'lucide-react';
import { Textarea } from './ui/textarea';

interface ChatWindowProps {
  chatId: string;
}

const ChatWindow: FC<ChatWindowProps> = ({ chatId }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { selectedChatId, setSelectedChatId } = useChatStore();

  useEffect(() => {
    setSelectedChatId(chatId);
  }, [chatId, setSelectedChatId]);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message,
          chatId: selectedChatId
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  }, [message, isSending, selectedChatId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  }, []);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {/* Messages will be rendered here */}
      </ScrollArea>
      
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="min-h-[60px] max-h-[200px] resize-none"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || isSending}
            className="self-end"
          >
            <Send size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow; 
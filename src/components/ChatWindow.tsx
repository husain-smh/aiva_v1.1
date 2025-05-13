'use client';

import { FC, useState, useCallback, useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { Message } from '@/types/chat';
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
  const bottomRef = useRef<HTMLDivElement>(null);

  const { selectedChatId, setSelectedChatId, messages, fetchMessages } = useChatStore();

  useEffect(() => {
    setSelectedChatId(chatId);
    if (chatId) {
      fetchMessages(chatId);
    }
  }, [chatId, setSelectedChatId, fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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
      // Fetch updated messages after sending
      if (selectedChatId) {
        await fetchMessages(selectedChatId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  }, [message, isSending, selectedChatId, fetchMessages]);

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
        {messages.map((msg) => (
          <div key={msg._id} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
            <div className="inline-block px-3 py-2 rounded bg-muted mb-2">{msg.content}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </ScrollArea>
      
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="min-h-[36px] max-h-[200px] resize-none"
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
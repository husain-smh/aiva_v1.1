'use client';

import { FC, useState, useCallback, useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { Message } from '@/types/chat';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Send } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { v4 as uuidv4 } from 'uuid';
import MessageBubble from './Message';
import TaskPanel from './TaskPanel';

interface ChatWindowProps {
  chatId: string;
}

interface Task {
  tool: string;
  input: any;
  output: any;
}

const ChatWindow: FC<ChatWindowProps> = ({ chatId }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const [showLoading, setShowLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [firstView, setFirstView] = useState(true); // Track if this is the first time viewing the chat
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { selectedChatId, setSelectedChatId, messages, fetchMessages, setMessages } = useChatStore();

  useEffect(() => {
    setSelectedChatId(chatId);
    if (chatId) {
      fetchMessages(chatId);
      setFirstView(true); // Reset first view when chat changes
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
  }, [messages, pendingMessages, showLoading]);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || isSending) return;

    // No longer the first view once user sends a message
    setFirstView(false);
    
    setIsSending(true);
    const userMsg: Message = {
      _id: uuidv4(),
      chatId: selectedChatId || '',
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };
    setPendingMessages((prev) => [...prev, userMsg]);
    setShowLoading(true);
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    try {
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: userMsg.content,
          chatId: selectedChatId
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      
      // Update tasks if they exist in the response
      if (data.tasks && data.tasks.length > 0) {
        setTasks(data.tasks);
      }

      // Fetch updated messages after sending
      if (selectedChatId) {
        await fetchMessages(selectedChatId);
      }
      setPendingMessages([]);
      setShowLoading(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setPendingMessages([]);
      setShowLoading(false);
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

  // Filter out "New chat" messages
  const filteredMessages = messages.filter(msg => msg.content !== 'New chat');

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {/* Display filtered messages and pending messages */}
        {[...filteredMessages, ...pendingMessages].map((msg, idx) => (
          <MessageBubble key={msg._id + idx} role={msg.role} content={msg.content} />
        ))}
        
        {/* Display welcome message if it's the first view and no messages (except "New chat") */}
        {firstView && filteredMessages.length === 0 && !showLoading && (
          <MessageBubble 
            role="assistant" 
            content="How can I help you today?" 
          />
        )}
        
        {showLoading && (
          <div className="text-left">
            <div className="inline-block px-3 py-2 rounded bg-muted mb-2 w-1/2 min-w-[120px] max-w-[320px]">
              <div className="flex items-center h-6">
                <span className="dot bg-primary animate-bounce mr-2" style={{ animationDelay: '0s' }} />
                <span className="dot bg-primary animate-bounce mx-2" style={{ animationDelay: '0.2s' }} />
                <span className="dot bg-primary animate-bounce ml-2" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
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

      <TaskPanel tasks={tasks} />
    </div>
  );
};

export default ChatWindow;

<style jsx global>{`
  .dot {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    opacity: 0.8;
  }
  .animate-bounce {
    animation: dot-bounce 1s infinite both;
  }
  @keyframes dot-bounce {
    0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
    40% { transform: scale(1.2); opacity: 1; }
  }
`}</style> 
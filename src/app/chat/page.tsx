'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import ChatWindow, { MessageType } from '@/components/ChatWindow';
import ConnectToolsButton from '@/components/ConnectToolsButton';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  // Handle sending a message
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);

    try {
      // Generate a temporary ID for the user message
      const tempUserMsgId = `temp-${Date.now()}`;
      
      // Add user message to UI immediately
      const userMessage: MessageType = {
        _id: tempUserMsgId,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, userMessage]);

      // Send message to the API
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          chatId: currentChatId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Update the messages with the real messages from the server
      setMessages((prev) => [
        ...prev.filter((msg) => msg._id !== tempUserMsgId),
        data.userMessage,
        data.assistantMessage,
      ]);

      // Update the current chat ID if this is a new chat
      if (!currentChatId) {
        setCurrentChatId(data.chatId);
        router.push(`/chat/${data.chatId}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the temporary message on error
      setMessages((prev) => prev.filter((msg) => !msg._id.startsWith('temp-')));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle tools connected
  const handleToolsConnected = (tools: any) => {
    console.log('Tools connected:', tools);
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex h-full">
      <Sidebar user={session.user} />
      
      <div className="flex flex-col flex-1 h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold">
            {currentChatId ? 'Chat' : 'New Chat'}
          </h1>
          <ConnectToolsButton onToolsConnected={handleToolsConnected} />
        </div>
        
        <div className="flex-1 overflow-hidden">
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>
    </div>
  );
} 
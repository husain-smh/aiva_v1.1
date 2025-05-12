'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import ChatWindow, { MessageType } from '@/components/ChatWindow';
import ConnectToolsButton from '@/components/ConnectToolsButton';
import UpdateUserPreferencesButton from '@/components/UpdateUserPreferencesButton';
import { Agent } from '@/types/agent';

export default function ChatById() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const chatId = Array.isArray(params.id) ? params.id[0] : params.id as string;
  
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatTitle, setChatTitle] = useState('');
  const [chatAgent, setChatAgent] = useState<Agent | null>(null);
  const [showRightSidebar, setShowRightSidebar] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  // Fetch chat messages
  useEffect(() => {
    if (status === 'authenticated' && chatId) {
      fetchMessages();
    }
  }, [status, chatId]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/chats/${chatId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/chat');
          return;
        }
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      setMessages(data.messages);
      setChatTitle(data.chat.title);
      
      // If the chat has an agentId, fetch the agent details
      if (data.chat.agentId) {
        fetchChatAgent(data.chat.agentId);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchChatAgent = async (agentId: string) => {
    try {
      const response = await fetch(`/api/agent/fetchAgent?id=${agentId}`);
      if (response.ok) {
        const data = await response.json();
        setChatAgent(data.agent);
      }
    } catch (error) {
      console.error('Error fetching chat agent:', error);
    }
  };

  // Handle sending a message
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || sendingMessage) return;

    setSendingMessage(true);

    try {
      // Generate a temporary ID for the user message
      const tempUserMsgId = `temp-${Date.now()}`;
      
      // Add user message to UI immediately
      const userMessage: MessageType = {
        _id: tempUserMsgId,
        role: 'user',
        agentId: chatAgent?.id,
        content,
        createdAt: new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, userMessage]);

      // Send message to the API with chatAgent's id if available
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          chatId,
          agentId: chatAgent?.id,
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
      setShowRightSidebar(true);
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the temporary message on error
      setMessages((prev) => prev.filter((msg) => !msg._id.startsWith('temp-')));
    } finally {
      setSendingMessage(false);
     
    }
  };

  // Handle tools connected
  const handleToolsConnected = (tools: any) => {
    console.log('Tools connected:', tools);
  };

  if (status === 'loading' || (isLoading && status !== 'unauthenticated')) {
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
      <div className="flex flex-1 h-full overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold truncate max-w-md">
              {chatTitle || 'Chat'}
            </h1>
            {chatAgent && (
              <span className="text-sm px-2 py-1 bg-primary/10 rounded-full">
                Agent: {chatAgent.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <UpdateUserPreferencesButton />
            <ConnectToolsButton onToolsConnected={handleToolsConnected} />
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <ChatWindow
            messages={messages}
            isLoading={sendingMessage}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      </div>
    </div>
  );
} 
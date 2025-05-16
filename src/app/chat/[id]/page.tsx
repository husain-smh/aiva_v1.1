'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import ConnectToolsButton from '@/components/ConnectToolsButton';
import UpdateUserPreferencesButton from '@/components/UpdateUserPreferencesButton';
import { useChatStore } from '@/store/chatStore';

export default function ChatById() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const chatId = Array.isArray(params.id) ? params.id[0] : params.id as string;

  const { selectedChatId, setSelectedChatId } = useChatStore();

  const [connectedTools, setConnectedTools] = useState<Record<string, boolean>>({});

  // Handler for tools connection status
  const handleToolsConnected = (tools: Record<string, boolean>) => {
    setConnectedTools(tools);
    // Optional: log or act based on connected tools
    console.log('Connected tools:', tools);
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  // Set selected chat ID when component mounts
  useEffect(() => {
    if (chatId) {
      setSelectedChatId(chatId);
    }
  }, [chatId, setSelectedChatId]);

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
      <div className="flex flex-col flex-1 h-full relative">
        {/* Floating buttons */}
        <div className="fixed top-4 right-8 z-50 flex gap-2">
          <UpdateUserPreferencesButton />
          <ConnectToolsButton onToolsConnected={handleToolsConnected} />
        </div>

        {/* Chat window */}
        <div className="flex-1 overflow-hidden">
          <ChatWindow chatId={chatId} />
        </div>
      </div>
    </div>
  );
}

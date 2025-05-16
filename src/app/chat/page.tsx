'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import ConnectToolsButton from '@/components/ConnectToolsButton';
import { Chat } from '@/components/Chat';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

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
    <div className="flex h-screen w-screen">
      <div className="h-full" style={{ maxWidth: 350, width: '20%' }}>
        <Sidebar user={session.user} />
      </div>
      <div className="flex-1 flex justify-center items-stretch">
        <div className="w-full max-w-[900px] min-w-0 flex flex-col">
          <Chat />
        </div>
      </div>
    </div>
  );
} 
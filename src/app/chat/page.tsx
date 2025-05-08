'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import ConnectToolsButton from '@/components/ConnectToolsButton';

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
    <div className="flex h-full">
      <Sidebar user={session.user} />
      <div className="flex flex-col flex-1 h-full items-center justify-center">
        <span className="text-2xl font-semibold text-foreground text-center">
          Hi {session.user?.name || 'there'}, how may I help?
        </span>
      </div>
    </div>
  );
} 
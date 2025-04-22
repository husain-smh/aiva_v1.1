'use client';

import { FC, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PlusCircle, MessageSquare, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Button } from './ui/button';

interface ChatItem {
  _id: string;
  title: string;
  createdAt: string;
}

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const Sidebar: FC<SidebarProps> = ({ user }) => {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await fetch('/api/chats');
        if (response.ok) {
          const data = await response.json();
          setChats(data);
        }
      } catch (error) {
        console.error('Error fetching chats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChats();
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <div
      className={`flex flex-col h-full border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!isCollapsed && <h2 className="text-xl font-bold">AIVA</h2>}
        <Button
          onClick={toggleSidebar}
          variant="ghost"
          size="icon"
          className="rounded-full"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <Link
          href="/chat"
          className="flex items-center gap-2 p-2 mb-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
        >
          <PlusCircle size={20} />
          {!isCollapsed && <span>New Chat</span>}
        </Link>

        {isLoading ? (
          <div className="flex justify-center p-4">
            <div className="h-5 w-5 border-2 border-sidebar-foreground border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-1">
            {chats.map((chat) => (
              <Link
                key={chat._id}
                href={`/chat/${chat._id}`}
                className={`flex items-center gap-2 p-2 rounded-lg hover:bg-sidebar-accent transition-colors ${
                  pathname === `/chat/${chat._id}` ? 'bg-sidebar-accent' : ''
                }`}
              >
                <MessageSquare size={20} />
                {!isCollapsed && (
                  <span className="truncate">{chat.title}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          {!isCollapsed && (
            <>
              {user.image && (
                <img
                  src={user.image}
                  alt={user.name || 'User'}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div className="flex-1 overflow-hidden">
                <p className="font-medium truncate">{user.name}</p>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              </div>
            </>
          )}
          <Button
            onClick={handleSignOut}
            variant="ghost"
            size="icon"
            className="rounded-full"
            title="Sign out"
          >
            <LogOut size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
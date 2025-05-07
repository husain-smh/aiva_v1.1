'use client';

import { FC, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PlusCircle, MessageSquare, LogOut, ChevronLeft, ChevronRight, MoreVertical, Pencil, Trash2, User, Settings } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { GlassCard } from './ui/GlassCard';

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const pathname = usePathname();
  const router = useRouter();

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

  const handleRename = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!response.ok) {
        throw new Error('Failed to rename chat');
      }

      setChats(chats.map(chat => 
        chat._id === chatId ? { ...chat, title: newTitle } : chat
      ));
      setEditingChatId(null);
      setNewTitle('');
    } catch (error) {
      console.error('Error renaming chat:', error);
    }
  };

  const handleDelete = async (chatId: string) => {
    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }

      setChats(chats.filter(chat => chat._id !== chatId));
      
      // If we're currently viewing the deleted chat, redirect to new chat
      if (pathname === `/chat/${chatId}`) {
        router.push('/chat');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
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
              <div
                key={chat._id}
                className={`group flex items-center justify-between p-2 rounded-lg hover:bg-sidebar-accent transition-colors ${
                  pathname === `/chat/${chat._id}` ? 'bg-sidebar-accent' : ''
                }`}
              >
                <Link
                  href={`/chat/${chat._id}`}
                  className="flex items-center gap-2 flex-1"
                >
                  {!isCollapsed && (
                    editingChatId === chat._id ? (
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRename(chat._id);
                          } else if (e.key === 'Escape') {
                            setEditingChatId(null);
                            setNewTitle('');
                          }
                        }}
                        onBlur={() => {
                          if (newTitle.trim()) {
                            handleRename(chat._id);
                          } else {
                            setEditingChatId(null);
                            setNewTitle('');
                          }
                        }}
                        className="bg-transparent border-none outline-none w-full"
                        autoFocus
                      />
                    ) : (
                      <span className="truncate">{chat.title}</span>
                    )
                  )}
                </Link>
                {!isCollapsed && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingChatId(chat._id);
                          setNewTitle(chat.title);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Rename</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(chat._id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="rounded-full p-2">
              <User size={24} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default Sidebar;
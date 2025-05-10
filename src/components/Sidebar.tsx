'use client';

import { FC, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PlusCircle, MessageSquare, LogOut, ChevronLeft, ChevronRight, MoreVertical, Pencil, Trash2, User, Settings, Bot } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { GlassCard } from './ui/GlassCard';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateAgentForm } from './Chat/CreateAgentForm';
import { Agent } from '@/types/agent';

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
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [showAgents, setShowAgents] = useState(false);
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
      
      if (pathname === `/chat/${chatId}`) {
        router.push('/chat');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handleNewChat = async () => {
    try {
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'New chat' }),
      });
      if (!response.ok) throw new Error('Failed to create new chat');
      const data = await response.json();
      if (data.chatId) {
        router.push(`/chat/${data.chatId}`);
      } else if (data._id) {
        router.push(`/chat/${data._id}`);
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleCreateAgent = (agent: Agent) => {
    setAgents(prev => [...prev, agent]);
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
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
          >
            <PlusCircle size={20} />
            {!isCollapsed && <span>New Chat</span>}
          </button>

          {!isCollapsed && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Bot size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Create New Agent</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
                  <CreateAgentForm onSubmit={handleCreateAgent} />
                </ScrollArea>
              </SheetContent>
            </Sheet>
          )}
        </div>

        {/* Agents Section */}
        {!isCollapsed && agents.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-muted-foreground">
              <Bot size={14} />
              <span>Agents</span>
            </div>
            <div className="space-y-1">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-sidebar-accent cursor-pointer"
                >
                  <span className="truncate text-sm">{agent.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chats Section */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-muted-foreground">
              <MessageSquare size={14} />
              <span>Chats</span>
            </div>
          )}
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
                          <Pencil size={16} className="mr-2" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(chat._id)}
                          className="text-destructive"
                        >
                          <Trash2 size={16} className="mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Info at the bottom */}
      <div className="p-4 border-t border-border mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent w-full cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-lg font-bold text-primary-foreground">
                {user?.name ? user.name[0] : '?'}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate">{user?.name || 'User Name'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email || 'user@example.com'}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <User size={16} className="mr-2" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings size={16} className="mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="text-destructive"
            >
              <LogOut size={16} className="mr-2" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default Sidebar;
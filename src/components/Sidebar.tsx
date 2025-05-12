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
import { Agent, CreateAgentInput } from '@/types/agent';

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
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [updatedAgentName, setUpdatedAgentName] = useState('');
  const [showAgents, setShowAgents] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [agentToEdit, setAgentToEdit] = useState<Agent | null>(null);
  const [isAgentFormOpen, setIsAgentFormOpen] = useState(false);
  const [agentFormMode, setAgentFormMode] = useState<'create' | 'update' | 'update-context'>('create');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentChats, setAgentChats] = useState<Record<string, ChatItem[]>>({});
  const [loadingAgentChats, setLoadingAgentChats] = useState(false);

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

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/agent/fetchAgents');
        if (response.ok) {
          const data = await response.json();
          const mappedAgents = data.agents.map((agent: any) => ({
            ...agent,
            id: agent._id || agent.id,
            apps: agent.connectedApps || agent.apps || [],
            createdAt: new Date(agent.createdAt)
          }));
          setAgents(mappedAgents);
        }
      } catch (error) {
        console.error('Error fetching agents:', error);
      }
    };
  
    fetchAgents();
  }, []);

  useEffect(() => {
    const fetchAgentChats = async () => {
      if (!selectedAgentId) return;
      
      setLoadingAgentChats(true);
      try {
        const response = await fetch(`/api/chats/byAgent/${selectedAgentId}`);
        if (response.ok) {
          const data = await response.json();
          setAgentChats(prev => ({
            ...prev,
            [selectedAgentId]: data
          }));
        }
      } catch (error) {
        console.error(`Error fetching chats for agent ${selectedAgentId}:`, error);
      } finally {
        setLoadingAgentChats(false);
      }
    };
    
    if (selectedAgentId) {
      fetchAgentChats();
    }
  }, [selectedAgentId]);

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
    if (selectedAgentId) {
      try {
        const response = await fetch('/api/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content: 'New chat',
            agentId: selectedAgentId 
          }),
        });
        
        if (!response.ok) throw new Error('Failed to create new chat');
        
        const data = await response.json();
        const chatId = data.chatId || data._id;
        
        if (chatId) {
          const newChat = {
            _id: chatId,
            title: 'New Chat',
            createdAt: new Date().toISOString()
          };
          
          setAgentChats(prev => ({
            ...prev,
            [selectedAgentId]: [newChat, ...(prev[selectedAgentId] || [])]
          }));
          
          router.push(`/chat/${chatId}`);
        }
      } catch (error) {
        console.error('Error creating new chat:', error);
      }
    } else {
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
    }
  };

  const handleCreateAgent = async (agentInput: CreateAgentInput) => {
    try {
      const response = await fetch('/api/agent/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: agentInput.name,
          description: agentInput.description,
          context: agentInput.context,
          instructions: agentInput.instructions,
          connectedApps: agentInput.apps,
        }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to create agent');
      }
  
      const data = await response.json();
      const newAgent: Agent = {
        ...data.agent,
        id: data.agent._id,
        apps: data.agent.connectedApps,
        createdAt: new Date(data.agent.createdAt),
      };
      
      setAgents(prev => [...prev, newAgent]);
      setIsAgentFormOpen(false);
    } catch (error) {
      console.error('Error creating agent:', error);
    }
  };

  const handleUpdateAgent = async (agentInput: CreateAgentInput) => {
    try {
      if (!agentToEdit) return;

      const updatedAgent: Agent = {
        ...agentToEdit,
        name: agentInput.name,
        description: agentInput.description,
        context: agentInput.context,
        instructions: agentInput.instructions,
        apps: agentInput.apps,
      };
      
      const response = await fetch(`/api/agent/updateAgent`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedAgent),
      });

      if (!response.ok) {
        throw new Error('Failed to update agent');
      }

      setAgents(agents.map(agent => 
        agent.id === agentToEdit.id ? updatedAgent : agent
      ));
      
      setAgentToEdit(null);
      setIsAgentFormOpen(false);
      setAgentFormMode('create');
    } catch (error) {
      console.error('Error updating agent:', error);
    }
  };

  const handleInlineUpdate = async (agentId: string) => {
    try {
      const agentToUpdate = agents.find(agent => agent.id === agentId);
      if (!agentToUpdate) return;

      const updatedAgent: Agent = {
        ...agentToUpdate,
        name: updatedAgentName
      };
      
      const response = await fetch(`/api/agent/updateAgent`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedAgent),
      });

      if (!response.ok) {
        throw new Error('Failed to update agent');
      }

      setAgents(agents.map(agent => 
        agent.id === agentId ? updatedAgent : agent
      ));
      
      setEditingAgentId(null);
      setUpdatedAgentName('');
    } catch (error) {
      console.error('Error updating agent:', error);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      const response = await fetch(`/api/agent/deleteAgent`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: agentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }

      setAgents(agents.filter(agent => agent.id !== agentId));
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  const openEditAgentForm = (agent: Agent) => {
    setAgentToEdit(agent);
    setAgentFormMode('update');
    setIsAgentFormOpen(true);
  };

  const handleUpdateAgentContext = (agent: Agent) => {
    // Set the agent to edit
    setAgentToEdit(agent);
    // Set the form mode to update context
    setAgentFormMode('update-context');
    // Open the agent form
    setIsAgentFormOpen(true);
  };

  const handleUpdateAgentContextSubmit = async (agentInput: CreateAgentInput) => {
    try {
      if (!agentToEdit) return;

      // Only update the context field
      const updatedAgent: Agent = {
        ...agentToEdit,
        context: agentInput.context
      };
      
      const response = await fetch(`/api/agent/updateAgent`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedAgent),
      });

      if (!response.ok) {
        throw new Error('Failed to update agent context');
      }

      setAgents(agents.map(agent => 
        agent.id === agentToEdit.id ? updatedAgent : agent
      ));
      
      setAgentToEdit(null);
      setIsAgentFormOpen(false);
      setAgentFormMode('create');
    } catch (error) {
      console.error('Error updating agent context:', error);
    }
  };

  return (
    <div
      className={`flex flex-col h-full border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Agent Creation Modal - always mounted */}
      <Sheet open={isAgentFormOpen} onOpenChange={setIsAgentFormOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {agentFormMode === 'create' ? 'Create New Agent' : agentFormMode === 'update' ? 'Update Agent' : 'Update Agent Context'}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
            <CreateAgentForm 
              onSubmit={
                agentFormMode === 'create' 
                  ? handleCreateAgent 
                  : agentFormMode === 'update' 
                    ? handleUpdateAgent 
                    : handleUpdateAgentContextSubmit
              } 
              agentToEdit={agentToEdit}
              mode={agentFormMode}
            />
          </ScrollArea>
        </SheetContent>
      </Sheet>
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
        {/* Agents Section - Updated to handle selection */}
        {!isCollapsed && agents.length > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center gap-2 px-2 py-1 text-xs font-semibold text-muted-foreground">
              {/* <Bot size={14} /> */}
              <span>Agents</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0 ml-1"
                onClick={() => {
                  setAgentFormMode('create');
                  setAgentToEdit(null);
                  setIsAgentFormOpen(true);
                }}
              >
                <span className="text-lg leading-none">+</span>
              </Button>
            </div>
            <div className="space-y-1">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className={`group flex items-center justify-between p-2 rounded-lg hover:bg-sidebar-accent cursor-pointer ${
                    selectedAgentId === agent.id ? 'bg-sidebar-accent' : ''
                  }`}
                  onClick={() => setSelectedAgentId(agent.id === selectedAgentId ? null : agent.id)}
                >
                  {editingAgentId === agent.id ? (
                    <input
                      type="text"
                      value={updatedAgentName}
                      onChange={(e) => setUpdatedAgentName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleInlineUpdate(agent.id);
                        } else if (e.key === 'Escape') {
                          setEditingAgentId(null);
                          setUpdatedAgentName('');
                        }
                      }}
                      onBlur={() => {
                        if (updatedAgentName.trim()) {
                          handleInlineUpdate(agent.id);
                        } else {
                          setEditingAgentId(null);
                          setUpdatedAgentName('');
                        }
                      }}
                      className="bg-transparent border-none outline-none flex-1"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate text-sm flex-1">{agent.name}</span>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditAgentForm(agent);
                        }}
                      >
                        <Pencil size={16} className="mr-2" /> Edit Agent
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateAgentContext(agent);
                        }}
                      >
                        <Settings size={16} className="mr-2" /> Update Agent Context
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAgent(agent.id);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 size={16} className="mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agent-specific chats section */}
        {selectedAgentId && !isCollapsed && (
          <div className="mb-4">
            <div className="flex justify-between items-center gap-2 px-2 py-1 text-xs font-semibold text-muted-foreground">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} />
                <span>Agent Chats</span>
              </div>
              <Button
                onClick={handleNewChat}
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
              >
                <PlusCircle size={14} />
              </Button>
            </div>
            {loadingAgentChats ? (
              <div className="flex justify-center p-4">
                <div className="h-5 w-5 border-2 border-sidebar-foreground border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : agentChats[selectedAgentId]?.length > 0 ? (
              <div className="space-y-1">
                {agentChats[selectedAgentId].map((chat) => (
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
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-2 py-1 text-xs text-muted-foreground">
                No chats yet. Create one to get started.
              </div>
            )}
          </div>
        )}

        {/* All Chats Section - Only show when no agent is selected */}
        {!selectedAgentId && (
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-muted-foreground">
                <MessageSquare size={14} />
                <span>All Chats</span>
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
        )}
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
'use client';

import { FC, useState, useEffect, useCallback, memo } from 'react';
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
import { useChatStore } from '@/store/chatStore';

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const Sidebar: FC<SidebarProps> = memo(({ user }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [updatedAgentName, setUpdatedAgentName] = useState('');
  const [isAgentFormOpen, setIsAgentFormOpen] = useState(false);
  const [agentFormMode, setAgentFormMode] = useState<'create' | 'update' | 'update-context'>('create');
  const [agentToEdit, setAgentToEdit] = useState<Agent | null>(null);
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [creatingChatAgentId, setCreatingChatAgentId] = useState<string | null>(null);

  const pathname = usePathname();
  const router = useRouter();

  // Zustand store selectors
  const {
    chats,
    agentChats,
    agents,
    selectedAgentId,
    selectedChatId,
    isLoading,
    loadingAgentChats,
    setSelectedAgentId,
    setSelectedChatId,
    createNewChat,
    createAgent,
    updateAgent,
    deleteAgent,
    renameChat,
    deleteChat,
    fetchAgentChats
  } = useChatStore();

  // Initial data fetching
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [chatsRes, agentsRes] = await Promise.all([
          fetch('/api/chats'),
          fetch('/api/agent/fetchAgents')
        ]);

        if (chatsRes.ok) {
          const chatsData = await chatsRes.json();
          useChatStore.getState().setChats(chatsData);
        }

        if (agentsRes.ok) {
          const data = await agentsRes.json();
          const mappedAgents = data.agents.map((agent: any) => ({
            ...agent,
            id: agent._id || agent.id,
            apps: agent.connectedApps || agent.apps || [],
            createdAt: new Date(agent.createdAt)
          }));
          useChatStore.getState().setAgents(mappedAgents);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        useChatStore.getState().setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleNewChat = useCallback(async () => {
    const newChat = await createNewChat(selectedAgentId || undefined);
    if (newChat?._id) {
      router.push(`/chat/${newChat._id}`);
    }
  }, [selectedAgentId, createNewChat, router]);

  const handleCreateAgent = useCallback(async (agentInput: CreateAgentInput) => {
    setIsCreatingAgent(true);
    try {
      await createAgent(agentInput);
      setIsAgentFormOpen(false);
    } finally {
      setIsCreatingAgent(false);
    }
  }, [createAgent]);

  const handleUpdateAgent = useCallback(async (agentInput: CreateAgentInput) => {
    if (!agentToEdit) return;
    await updateAgent(agentToEdit.id, agentInput);
    setAgentToEdit(null);
    setIsAgentFormOpen(false);
    setAgentFormMode('create');
  }, [agentToEdit, updateAgent]);

  const handleDeleteAgent = useCallback(async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    await deleteAgent(agentId);
  }, [deleteAgent]);

  const handleRename = useCallback(async (chatId: string) => {
    if (!newTitle.trim()) return;
    await renameChat(chatId, newTitle);
    setEditingChatId(null);
    setNewTitle('');
  }, [newTitle, renameChat]);

  const handleDelete = useCallback(async (chatId: string) => {
    if (!confirm('Are you sure you want to delete this chat?')) return;
    await deleteChat(chatId);
    if (pathname === `/chat/${chatId}`) {
      router.push('/chat');
    }
  }, [pathname, router, deleteChat]);

  const handleExpandAgent = useCallback(async (agentId: string) => {
    if (expandedAgentId !== agentId) {
      if (!agentChats[agentId]) {
        await fetchAgentChats(agentId);
      }
      setExpandedAgentId(agentId);
    } else {
      setExpandedAgentId(null);
    }
  }, [expandedAgentId, agentChats, fetchAgentChats]);

  const handleNewChatForAgent = useCallback(async (agentId: string) => {
    setCreatingChatAgentId(agentId);
    try {
      const newChat = await createNewChat(agentId);
      setExpandedAgentId(agentId);
      if (newChat?._id) {
        router.push(`/chat/${newChat._id}`);
      }
    } finally {
      setCreatingChatAgentId(null);
    }
  }, [createNewChat, router]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleInlineUpdate = async (agentId: string) => {
    try {
      const agentToUpdate = agents.find(agent => agent.id === agentId);
      if (!agentToUpdate) return;

      const updatedAgent: Agent = {
        ...agentToUpdate,
        name: updatedAgentName
      };
      
      await updateAgent(agentId, updatedAgent);
      
      setEditingAgentId(null);
      setUpdatedAgentName('');
    } catch (error) {
      console.error('Error updating agent:', error);
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
      
      await updateAgent(agentToEdit.id, updatedAgent);
      
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
                disabled={isCreatingAgent}
              >
                {isCreatingAgent ? (
                  <span className="animate-spin h-4 w-4 border-2 border-sidebar-foreground border-t-transparent rounded-full inline-block"></span>
                ) : (
                  <span className="text-lg leading-none">+</span>
                )}
              </Button>
            </div>
            <div className="space-y-3">
              {agents.map((agent) => (
                <div key={agent.id}>
                  <div
                    className={`group flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer transition-colors
                      ${expandedAgentId === agent.id ? '' : ''}
                      hover:bg-sidebar-accent
                    `}
                    style={{ marginBottom: expandedAgentId === agent.id ? '0.25rem' : '0.5rem' }}
                    onClick={() => {
                      if (expandedAgentId !== agent.id) {
                        handleExpandAgent(agent.id);
                      } else {
                        setExpandedAgentId(null);
                      }
                    }}
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
                      <span className="truncate text-base font-semibold flex-1">{agent.name}</span>
                    )}
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0"
                        onClick={async () => {
                          setCreatingChatAgentId(agent.id);
                          await handleNewChatForAgent(agent.id);
                          setCreatingChatAgentId(null);
                        }}
                        title="New Chat"
                        disabled={creatingChatAgentId === agent.id}
                      >
                        {creatingChatAgentId === agent.id ? (
                          <span className="animate-spin h-4 w-4 border-2 border-sidebar-foreground border-t-transparent rounded-full inline-block"></span>
                        ) : (
                          <PlusCircle size={16} />
                        )}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
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
                  </div>
                  {/* Agent's chats dropdown */}
                  {expandedAgentId === agent.id && (
                    <div className="ml-4 mt-2 mb-2">
                      {loadingAgentChats && expandedAgentId === agent.id ? (
                        <div className="flex justify-center p-2">
                          <div className="h-5 w-5 border-2 border-sidebar-foreground border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : agentChats[agent.id]?.length > 0 ? (
                        <div className="space-y-1">
                          {agentChats[agent.id].map((chat) => (
                            <div
                              key={chat._id}
                              className={`group flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer transition-colors ml-2
                                ${pathname === `/chat/${chat._id}` ? 'bg-sidebar-accent' : ''}
                                hover:bg-sidebar-accent
                              `}
                              style={{ marginBottom: '0.25rem' }}
                            >
                              <Link
                                href={`/chat/${chat._id}`}
                                className="flex items-center gap-2 flex-1"
                              >
                                {editingChatId === chat._id ? (
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
                        <div className="px-2 py-1 text-xs text-muted-foreground ml-2">
                          No chats yet. Create one to get started.
                        </div>
                      )}
                    </div>
                  )}
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
});

export default Sidebar;
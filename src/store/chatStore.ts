import { create } from 'zustand';
import { Agent, CreateAgentInput } from '@/types/agent';

export interface ChatItem {
  _id: string;
  title: string;
  createdAt: string;
  agentId?: string;
}

interface ChatState {
  // State
  chats: ChatItem[];
  agentChats: Record<string, ChatItem[]>;
  selectedAgentId: string | null;
  selectedChatId: string | null;
  agents: Agent[];
  isLoading: boolean;
  loadingAgentChats: boolean;

  // Actions
  setChats: (chats: ChatItem[]) => void;
  setAgentChats: (agentId: string, chats: ChatItem[]) => void;
  setSelectedAgentId: (agentId: string | null) => void;
  setSelectedChatId: (chatId: string | null) => void;
  setAgents: (agents: Agent[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setLoadingAgentChats: (loading: boolean) => void;

  // Complex Actions
  createNewChat: (agentId?: string) => Promise<void>;
  createAgent: (agentInput: CreateAgentInput) => Promise<void>;
  updateAgent: (agentId: string, agentInput: CreateAgentInput) => Promise<void>;
  deleteAgent: (agentId: string) => Promise<void>;
  renameChat: (chatId: string, newTitle: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  fetchAgentChats: (agentId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial State
  chats: [],
  agentChats: {},
  selectedAgentId: null,
  selectedChatId: null,
  agents: [],
  isLoading: true,
  loadingAgentChats: false,

  // Basic Actions
  setChats: (chats) => set({ chats }),
  setAgentChats: (agentId, chats) => 
    set((state) => ({
      agentChats: { ...state.agentChats, [agentId]: chats }
    })),
  setSelectedAgentId: (agentId) => set({ selectedAgentId: agentId }),
  setSelectedChatId: (chatId) => set({ selectedChatId: chatId }),
  setAgents: (agents) => set({ agents }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setLoadingAgentChats: (loading) => set({ loadingAgentChats: loading }),

  // Complex Actions
  createNewChat: async (agentId) => {
    try {
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: 'New chat',
          agentId 
        }),
      });

      if (!response.ok) throw new Error('Failed to create new chat');
      
      const data = await response.json();
      const chatId = data.chatId || data._id;
      
      if (chatId) {
        const newChat = {
          _id: chatId,
          title: 'New Chat',
          createdAt: new Date().toISOString(),
          agentId
        };

        if (agentId) {
          set((state) => ({
            agentChats: {
              ...state.agentChats,
              [agentId]: [newChat, ...(state.agentChats[agentId] || [])]
            }
          }));
        } else {
          set((state) => ({
            chats: [newChat, ...state.chats]
          }));
        }

        set({ selectedChatId: chatId });
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  },

  createAgent: async (agentInput) => {
    try {
      const response = await fetch('/api/agent/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agentInput.name,
          description: agentInput.description,
          context: agentInput.context,
          instructions: agentInput.instructions,
          connectedApps: agentInput.apps,
        }),
      });

      if (!response.ok) throw new Error('Failed to create agent');

      const data = await response.json();
      const newAgent: Agent = {
        ...data.agent,
        id: data.agent._id,
        apps: data.agent.connectedApps,
        createdAt: new Date(data.agent.createdAt),
      };

      set((state) => ({
        agents: [...state.agents, newAgent]
      }));
    } catch (error) {
      console.error('Error creating agent:', error);
    }
  },

  updateAgent: async (agentId, agentInput) => {
    try {
      const currentAgent = get().agents.find(a => a.id === agentId);
      if (!currentAgent) return;

      const updatedAgent: Agent = {
        ...currentAgent,
        name: agentInput.name,
        description: agentInput.description,
        context: agentInput.context,
        instructions: agentInput.instructions,
        apps: agentInput.apps,
      };

      const response = await fetch(`/api/agent/updateAgent`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAgent),
      });

      if (!response.ok) throw new Error('Failed to update agent');

      set((state) => ({
        agents: state.agents.map(agent => 
          agent.id === agentId ? updatedAgent : agent
        )
      }));
    } catch (error) {
      console.error('Error updating agent:', error);
    }
  },

  deleteAgent: async (agentId) => {
    try {
      const response = await fetch(`/api/agent/deleteAgent`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: agentId }),
      });

      if (!response.ok) throw new Error('Failed to delete agent');

      set((state) => ({
        agents: state.agents.filter(agent => agent.id !== agentId),
        agentChats: Object.fromEntries(
          Object.entries(state.agentChats).filter(([id]) => id !== agentId)
        )
      }));
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  },

  renameChat: async (chatId, newTitle) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!response.ok) throw new Error('Failed to rename chat');

      set((state) => ({
        chats: state.chats.map(chat => 
          chat._id === chatId ? { ...chat, title: newTitle } : chat
        ),
        agentChats: Object.fromEntries(
          Object.entries(state.agentChats).map(([agentId, chats]) => [
            agentId,
            chats.map(chat => 
              chat._id === chatId ? { ...chat, title: newTitle } : chat
            )
          ])
        )
      }));
    } catch (error) {
      console.error('Error renaming chat:', error);
    }
  },

  deleteChat: async (chatId) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete chat');

      set((state) => ({
        chats: state.chats.filter(chat => chat._id !== chatId),
        agentChats: Object.fromEntries(
          Object.entries(state.agentChats).map(([agentId, chats]) => [
            agentId,
            chats.filter(chat => chat._id !== chatId)
          ])
        )
      }));
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  },

  fetchAgentChats: async (agentId) => {
    set({ loadingAgentChats: true });
    try {
      const response = await fetch(`/api/chats/byAgent/${agentId}`);
      if (response.ok) {
        const data = await response.json();
        set((state) => ({
          agentChats: { ...state.agentChats, [agentId]: data }
        }));
      }
    } catch (error) {
      console.error(`Error fetching chats for agent ${agentId}:`, error);
    } finally {
      set({ loadingAgentChats: false });
    }
  }
})); 
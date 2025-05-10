import { useState } from 'react';
import { Agent, CreateAgentInput } from '@/types/agent';
import { CreateAgentForm } from './CreateAgentForm';
import { AgentSelector } from './AgentSelector';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

interface Message {
    id: string;
    content: string;
    sender: 'user' | 'agent';
    timestamp: Date;
}

export function Chat() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');

    const handleCreateAgent = (agentInput: CreateAgentInput) => {
        const newAgent: Agent = {
            ...agentInput,
            id: `agent-${Date.now()}`,
            createdAt: new Date()
        };
        setAgents(prev => [...prev, newAgent]);
        setShowCreateForm(false);
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMessage.trim() || !selectedAgent) return;

        const newMessage: Message = {
            id: `msg-${Date.now()}`,
            content: inputMessage,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newMessage]);
        setInputMessage('');

        // Here you would typically handle the agent's response
        // For now, we'll just add a mock response
        setTimeout(() => {
            const response: Message = {
                id: `msg-${Date.now()}`,
                content: `Response from ${selectedAgent.name}`,
                sender: 'agent',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, response]);
        }, 1000);
    };

    return (
        <div className="container mx-auto p-4 grid grid-cols-12 gap-4 h-screen">
            {/* Sidebar */}
            <div className="col-span-4 space-y-4">
                <Button
                    className="w-full"
                    onClick={() => setShowCreateForm(!showCreateForm)}
                >
                    {showCreateForm ? 'Show Agents' : 'Create New Agent'}
                </Button>

                {showCreateForm ? (
                    <CreateAgentForm onSubmit={handleCreateAgent} />
                ) : (
                    <AgentSelector
                        agents={agents}
                        selectedAgentId={selectedAgent?.id || null}
                        onSelectAgent={setSelectedAgent}
                    />
                )}
            </div>

            {/* Chat Area */}
            <div className="col-span-8">
                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle>
                            {selectedAgent ? `Chat with ${selectedAgent.name}` : 'Select an agent to start chatting'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                        <ScrollArea className="flex-1 pr-4">
                            <div className="space-y-4">
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`p-3 rounded-lg ${
                                            message.sender === 'user'
                                                ? 'bg-primary text-primary-foreground ml-auto'
                                                : 'bg-secondary'
                                        } max-w-[80%] ${message.sender === 'user' ? 'ml-auto' : 'mr-auto'}`}
                                    >
                                        {message.content}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <form onSubmit={handleSendMessage} className="mt-4">
                            <div className="flex gap-2">
                                <Input
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    disabled={!selectedAgent}
                                />
                                <Button type="submit" disabled={!selectedAgent}>
                                    Send
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 
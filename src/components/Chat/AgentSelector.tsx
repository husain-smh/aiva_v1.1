import { Agent } from '@/types/agent';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AgentSelectorProps {
    agents: Agent[];
    selectedAgentId: string | null;
    onSelectAgent: (agent: Agent) => void;
}

export function AgentSelector({ agents, selectedAgentId, onSelectAgent }: AgentSelectorProps) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Available Agents</CardTitle>
                <CardDescription>Select an agent to chat with</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-4">
                        {agents.map((agent) => (
                            <div
                                key={agent.id}
                                className={`p-4 rounded-lg cursor-pointer transition-colors ${
                                    selectedAgentId === agent.id
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-secondary hover:bg-secondary/80'
                                }`}
                                onClick={() => onSelectAgent(agent)}
                            >
                                <h3 className="font-semibold">{agent.name}</h3>
                                <p className="text-sm opacity-90">{agent.description}</p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {agent.apps.map((app, index) => (
                                        <span
                                            key={index}
                                            className={`text-xs px-2 py-1 rounded ${
                                                selectedAgentId === agent.id
                                                    ? 'bg-primary-foreground/20 text-primary-foreground'
                                                    : 'bg-background/50'
                                            }`}
                                        >
                                            {app}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
} 
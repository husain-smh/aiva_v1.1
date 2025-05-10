export interface Agent {
    id: string;
    name: string;
    description: string;
    context: string;
    instructions: string;
    apps: string[];
    createdAt: Date;
}

export type CreateAgentInput = Omit<Agent, 'id' | 'createdAt'>; 
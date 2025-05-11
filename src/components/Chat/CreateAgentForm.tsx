import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Agent, CreateAgentInput } from '@/types/agent';

interface AgentFormProps {
    onSubmit: (agent: CreateAgentInput) => void;
    agentToEdit?: Agent | null;
    mode: 'create' | 'update';
}

export function CreateAgentForm({ onSubmit, agentToEdit = null, mode = 'create' }: AgentFormProps) {
    const [formData, setFormData] = useState<CreateAgentInput>({
        name: '',
        description: '',
        context: '',
        instructions: '',
        apps: []
    });

    const [appInput, setAppInput] = useState('');

    // Initialize form with agent data if in edit mode
    useEffect(() => {
        if (agentToEdit && mode === 'update') {
            setFormData({
                name: agentToEdit.name,
                description: agentToEdit.description,
                context: agentToEdit.context,
                instructions: agentToEdit.instructions,
                apps: [...agentToEdit.apps]
            });
        }
    }, [agentToEdit, mode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const handleAddApp = () => {
        if (appInput.trim()) {
            setFormData(prev => ({
                ...prev,
                apps: [...prev.apps, appInput.trim()]
            }));
            setAppInput('');
        }
    };

    const handleRemoveApp = (index: number) => {
        setFormData(prev => ({
            ...prev,
            apps: prev.apps.filter((_, i) => i !== index)
        }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Agent name"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe your agent's purpose"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="context">Context</Label>
                    <Textarea
                        id="context"
                        value={formData.context}
                        onChange={(e) => setFormData(prev => ({ ...prev, context: e.target.value }))}
                        placeholder="Provide context for your agent"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="instructions">Instructions</Label>
                    <Textarea
                        id="instructions"
                        value={formData.instructions}
                        onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                        placeholder="Provide instructions for your agent"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label>Apps</Label>
                    <div className="flex gap-2">
                        <Input
                            value={appInput}
                            onChange={(e) => setAppInput(e.target.value)}
                            placeholder="Add app"
                        />
                        <Button type="button" onClick={handleAddApp} className="shrink-0">Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {formData.apps.map((app, index) => (
                            <div key={index} className="flex items-center gap-1 bg-secondary p-1 rounded">
                                <span>{app}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveApp(index)}
                                    className="text-destructive hover:text-destructive-foreground"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="pt-4 pb-2">
                <Button type="submit" className="w-full">
                    {mode === 'create' ? 'Create Agent' : 'Update Agent'}
                </Button>
            </div>
        </form>
    );
} 
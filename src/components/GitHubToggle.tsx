'use client';

import { FC, useState } from 'react';
import { Github } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

interface GitHubToggleProps {
  onToggle?: (isConnected: boolean) => void;
}

const GitHubToggle: FC<GitHubToggleProps> = ({ onToggle }) => {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (checked: boolean) => {
    if (!session?.user?.id) return;
    
    setIsLoading(true);
    
    try {
      if (checked) {
        // Connect GitHub
        const response = await fetch('/api/services/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            service: 'github',
            integration_id: '3a08be07-a15e-4417-962b-037c2b9913f6'
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to connect GitHub');
        }

        const data = await response.json();
        
        // If there's a redirect URL, open it in a new window/tab
        if (data.redirectUrl) {
          window.open(data.redirectUrl, '_blank');
        }
        
        setIsConnected(true);
        
        if (onToggle) {
          onToggle(true);
        }
      } else {
        // Disconnect GitHub logic would go here
        // For now, we'll just update the UI state
        setIsConnected(false);
        
        if (onToggle) {
          onToggle(false);
        }
      }
    } catch (error) {
      console.error('Error toggling GitHub connection:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Github size={16} className={isConnected ? "text-purple-500" : "text-gray-500"} />
      <Label htmlFor="github-toggle" className="cursor-pointer">
        GitHub
      </Label>
      <Switch 
        id="github-toggle"
        checked={isConnected}
        onCheckedChange={handleToggle}
        disabled={isLoading}
      />
    </div>
  );
};

export default GitHubToggle; 
'use client';

import { FC, useState, useEffect } from 'react';
import { Mail } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

interface GmailToggleProps {
  onToggle?: (isConnected: boolean) => void;
}

const GmailToggle: FC<GmailToggleProps> = ({ onToggle }) => {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (checked: boolean) => {
    if (!session?.user?.id) return;
    
    setIsLoading(true);
    
    try {
      if (checked) {
        // Connect Gmail
        const response = await fetch('/api/composio/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: session.user.email,
            tool: 'gmail'
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to connect Gmail');
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
        // Disconnect Gmail logic would go here
        // For now, we'll just update the UI state
        setIsConnected(false);
        
        if (onToggle) {
          onToggle(false);
        }
      }
    } catch (error) {
      console.error('Error toggling Gmail connection:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Mail size={16} className={isConnected ? "text-blue-500" : "text-gray-500"} />
      <Label htmlFor="gmail-toggle" className="cursor-pointer">
        Gmail
      </Label>
      <Switch 
        id="gmail-toggle"
        checked={isConnected}
        onCheckedChange={handleToggle}
        disabled={isLoading}
      />
    </div>
  );
};

export default GmailToggle; 
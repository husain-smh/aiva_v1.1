'use client';

import { FC, useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

interface WhatsAppToggleProps {
  onToggle?: (isConnected: boolean) => void;
}

const WhatsAppToggle: FC<WhatsAppToggleProps> = ({ onToggle }) => {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (checked: boolean) => {
    if (!session?.user?.id) return;
    
    setIsLoading(true);
    
    try {
      if (checked) {
        // Connect WhatsApp
        const response = await fetch('/api/services/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            service: 'whatsapp',
            integration_id: '8987897f-f1db-4b4e-a625-4ee51d9c9b98'
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to connect WhatsApp');
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
        // Disconnect WhatsApp logic would go here
        // For now, we'll just update the UI state
        setIsConnected(false);
        
        if (onToggle) {
          onToggle(false);
        }
      }
    } catch (error) {
      console.error('Error toggling WhatsApp connection:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <MessageSquare size={16} className={isConnected ? "text-green-500" : "text-gray-500"} />
      <Label htmlFor="whatsapp-toggle" className="cursor-pointer">
        WhatsApp
      </Label>
      <Switch 
        id="whatsapp-toggle"
        checked={isConnected}
        onCheckedChange={handleToggle}
        disabled={isLoading}
      />
    </div>
  );
};

export default WhatsAppToggle; 
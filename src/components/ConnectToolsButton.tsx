'use client';

import { FC, useState } from 'react';
import { Link2 } from 'lucide-react';
import { Button } from './ui/button';

interface ConnectToolsButtonProps {
  onToolsConnected?: (tools: any) => void;
}

const ConnectToolsButton: FC<ConnectToolsButtonProps> = ({
  onToolsConnected,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectTools = async () => {
    setIsConnecting(true);

    try {
      // This is a mock of calling composio.connect()
      // In a real application, you would use the actual composio SDK
      console.log('Connecting tools...');
      
      // Simulate tool connection
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const tools = { name: 'Gmail', connected: true };
      
      // Call the API to save connected tools
      const response = await fetch('/api/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tools }),
      });

      if (!response.ok) {
        throw new Error('Failed to save connected tools');
      }

      if (onToolsConnected) {
        onToolsConnected(tools);
      }
    } catch (error) {
      console.error('Error connecting tools:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Button
      onClick={handleConnectTools}
      disabled={isConnecting}
      variant="secondary"
      className="flex items-center gap-2"
    >
      <Link2 size={16} />
      {isConnecting ? 'Connecting...' : 'Connect Tools'}
    </Button>
  );
};

export default ConnectToolsButton; 
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { OpenAIToolSet } from 'composio-core';

interface Service {
  id: string;
  name: string;
  integration_id: string;
  isConnected: boolean;
}

interface Connection {
  id: string;
  integrationId: string;
  status: 'ACTIVE' | 'PENDING' | 'FAILED';
}

interface ConnectToolsButtonProps {
  onToolsConnected: (tools: any) => void;
}

export default function ConnectToolsButton({ onToolsConnected }: ConnectToolsButtonProps) {
  const { data: session } = useSession();
  const [services, setServices] = useState<Service[]>([
    {
      id: 'gmail',
      name: 'Gmail',
      integration_id: '66b951b0-e0bd-4179-83d6-ee2ff7a143e3',
      isConnected: false,
    }
  ]);

  const handleServiceToggle = async (service: Service) => {
    try {
      if (!session?.user?.email) {
        console.error('No user email found');
        return;
      }

      // Initiate the connection through our API
      const connectResponse = await fetch('/api/services/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service: service.id,
          integration_id: service.integration_id,
        }),
      });

      if (!connectResponse.ok) {
        const errorData = await connectResponse.json();
        throw new Error(errorData.error || 'Failed to connect service');
      }

      const data = await connectResponse.json();

      if (!data.redirectUrl || !data.connectionId) {
        console.error('Invalid response data:', data);
        throw new Error('Invalid response from server');
      }

      // Open the OAuth window
      const width = 600;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        data.redirectUrl,
        'Connect Service',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Wait for the connection to become active
      try {
        console.log("Waiting for user authorization and connection activation...");
        
        // Poll the server to check connection status
        const checkStatus = async () => {
          const statusResponse = await fetch(`/api/services/status?connectionId=${data.connectionId}`);
          if (!statusResponse.ok) {
            const errorData = await statusResponse.json();
            throw new Error(errorData.error || 'Failed to check connection status');
          }
          return statusResponse.json();
        };

        // Poll every 5 seconds for up to 3 minutes
        const startTime = Date.now();
        const timeout = 180 * 1000; // 3 minutes in milliseconds
        const interval = 5000; // 5 seconds

        const pollConnection = async () => {
          const status = await checkStatus();
          
          if (status.status === 'ACTIVE') {
            console.log(`Success! Connection is ACTIVE. ID: ${status.connectionId}`);
            setServices(prev =>
              prev.map(s =>
                s.id === service.id ? { ...s, isConnected: true } : s
              )
            );
            onToolsConnected({ [service.id]: true });
            if (popup) popup.close();
            return true;
          }

          if (Date.now() - startTime > timeout) {
            throw new Error('Connection timeout');
          }

          return false;
        };

        // Start polling
        while (!(await pollConnection())) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }

      } catch (error) {
        console.error("Connection did not become active within timeout or failed:", error);
        // Reset the toggle if connection fails
        setServices(prev =>
          prev.map(s =>
            s.id === service.id ? { ...s, isConnected: false } : s
          )
        );
      }
    } catch (error) {
      console.error('Error connecting service:', error);
      // Reset the toggle if there's an error
      setServices(prev =>
        prev.map(s =>
          s.id === service.id ? { ...s, isConnected: false } : s
        )
      );
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Connect Tools</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Available Services</SheetTitle>
        </SheetHeader>
        <div className="py-4">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between py-2"
            >
              <span className="font-medium">{service.name}</span>
              <Switch
                checked={service.isConnected}
                onCheckedChange={() => handleServiceToggle(service)}
              />
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
} 
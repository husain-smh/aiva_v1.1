'use client';

import { useState } from 'react';
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

interface ConnectToolsButtonProps {
  onToolsConnected: (tools: any) => void;
}

export default function ConnectToolsButton({ onToolsConnected }: ConnectToolsButtonProps) {
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
      const response = await fetch('/api/services/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service: service.id,
          integration_id: service.integration_id,
        }),
      });

      const data = await response.json();

      if (data.redirectUrl) {
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

        // Initialize Composio to wait for connection activation
        const toolset = new OpenAIToolSet({
          apiKey: process.env.NEXT_PUBLIC_COMPOSIO_API_KEY,
        });

        // Wait for the connection to become active
        try {
          const activeConnection = await toolset.connectedAccounts.waitUntilActive(data.connectionId, 180);
          
          // Update the service status
          setServices(prev =>
            prev.map(s =>
              s.id === service.id ? { ...s, isConnected: true } : s
            )
          );
          onToolsConnected({ [service.id]: true });
          
          // Close the popup
          if (popup) {
            popup.close();
          }
        } catch (error) {
          console.error('Error waiting for connection activation:', error);
          // Handle error - show message to user
        }
      }
    } catch (error) {
      console.error('Error connecting service:', error);
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
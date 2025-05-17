'use client';

import { useState, useEffect } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { OpenAIToolSet } from 'composio-core';
import { Loader2 } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  integration_id: string;
  isConnected: boolean;
  isLoading?: boolean;
  connectionStatus?: 'idle' | 'loading' | 'verifying' | 'failed';
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
  const [isLoading, setIsLoading] = useState(true);
  const [serviceErrors, setServiceErrors] = useState<Record<string, string>>({});
  const [activeConnections, setActiveConnections] = useState<Set<string>>(new Set());
  const [services, setServices] = useState<Service[]>([
    {
      id: 'gmail',
      name: 'Gmail',
      integration_id: '66b951b0-e0bd-4179-83d6-ee2ff7a143e3',
      isConnected: false,
      isLoading: false,
      connectionStatus: 'idle',
    },
    // {
    //   id: 'whatsapp',
    //   name: 'WhatsApp',
    //   integration_id: '8987897f-f1db-4b4e-a625-4ee51d9c9b98',
    //   isConnected: false,
    //   isLoading: false,
    // },
    // {
    //   id: 'github',
    //   name: 'GitHub',
    //   integration_id: '3a08be07-a15e-4417-962b-037c2b9913f6',
    //   isConnected: false,
    //   isLoading: false,
    // },
    {
      id: 'calendar',
      name: 'Calendar',
      integration_id: '5b0a4e2e-f007-4d56-907b-f6f3fd8c96e1',
      isConnected: false,
      isLoading: false,
      connectionStatus: 'idle',
    },
    {
      id: 'googledrive',
      name: 'GoogleDrive',
      integration_id: '494d1625-8233-4e5f-ad00-29898fd12af6',
      isConnected: false,
      isLoading: false,
      connectionStatus: 'idle',
    },
    {
      id: 'googledocs',
      name: 'GoogleDocs',
      integration_id: 'cd91fc63-9031-4b5e-af63-c768409feab3',
      isConnected: false,
      isLoading: false,
      connectionStatus: 'idle',
    },
    {
      id: 'yousearch',
      name: 'YouSearch',
      integration_id: '7432f833-7d87-495e-8e69-d1ea8a2c4d26',
      isConnected: false,
      isLoading: false,
      connectionStatus: 'idle',
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      integration_id: '4790d27a-b2fb-4f61-93a1-bd585e52a45a',
      isConnected: false,
      isLoading: false,
      connectionStatus: 'idle',
    },
    // {
    //   id: 'slack',
    //   name: 'Slack',
    //   integration_id: 'df352f08-f7cb-4c4f-859a-ee58214e1268',
    //   isConnected: false,
    //   isLoading: false,
    // },
    // {
    //   id: 'jira',
    //   name: 'Jira',
    //   integration_id: 'eb2a8c6c-1dba-4a99-8c9d-637e26a0f5f0',
    //   isConnected: false,
    //   isLoading: false,
    // },
    {
      id: 'googlesheets',
      name: 'GoogleSheets',
      integration_id: '876cd789-33d7-4cc0-b048-9b8be5a5a3f2',
      isConnected: false,
      isLoading: false,
      connectionStatus: 'idle',
    }
  ]);

  // Helper function to detect mobile devices
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  // Load connected tools when component mounts
  useEffect(() => {
    async function loadConnectedTools() {
      if (!session?.user) return;
      
      try {
        setIsLoading(true);
        const response = await fetch('/api/services/tools');
        
        if (!response.ok) {
          throw new Error('Failed to fetch connected tools');
        }
        
        const data = await response.json();
        const connectedTools = data.connectedTools || [];
        
        // Update services state with connected tools
        setServices(prev => 
          prev.map(service => ({
            ...service,
            isConnected: connectedTools.includes(service.id),
            connectionStatus: 'idle'
          }))
        );
        
        // Update parent component with connected tools
        if (typeof onToolsConnected === 'function') {
          const toolsObj = connectedTools.reduce((acc: Record<string, boolean>, tool: string) => {
            acc[tool] = true;
            return acc;
          }, {});
          onToolsConnected(toolsObj);
        }
      } catch (error) {
        console.error('Error loading connected tools:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadConnectedTools();
    // Note: onToolsConnected is intentionally omitted from the dependency array to prevent infinite re-renders.
    // If you need to include it, make sure to memoize it in the parent component using useCallback.
  }, [session]);

  // Handle mobile redirect returns
  useEffect(() => {
    const pendingAuthStr = sessionStorage.getItem('pendingAuth');
    if (!pendingAuthStr) return;
    
    try {
      const pendingAuth = JSON.parse(pendingAuthStr);
      
      // Clean up immediately to prevent reprocessing
      sessionStorage.removeItem('pendingAuth');
      
      // Check if auth has timed out (over 5 minutes old)
      const authAge = Date.now() - pendingAuth.startTime;
      if (authAge > 5 * 60 * 1000) {
        console.log('Pending auth is too old, ignoring');
        return;
      }
      
      // Find the service
      const service = services.find(s => s.id === pendingAuth.serviceId);
      if (!service) return;
      
      // Set loading state and clear any errors
      setServices(prev =>
        prev.map(s =>
          s.id === service.id ? { 
            ...s, 
            isLoading: true,
            connectionStatus: 'verifying'
          } : s
        )
      );
      
      setServiceErrors(prev => ({
        ...prev,
        [service.id]: ''
      }));
      
      // Add to active connections set
      setActiveConnections(prev => new Set(prev).add(service.id));
      
      // Check connection status
      const checkStatus = async () => {
        try {
          const statusResponse = await fetch(`/api/services/status?connectionId=${pendingAuth.connectionId}`);
          if (!statusResponse.ok) {
            throw new Error('Failed to check connection status');
          }
          
          const status = await statusResponse.json();
          
          if (status.status === 'ACTIVE') {
            // Handle successful connection
            setServices(prev =>
              prev.map(s =>
                s.id === service.id ? { 
                  ...s, 
                  isConnected: true, 
                  isLoading: false,
                  connectionStatus: 'idle' 
                } : s
              )
            );
            
            // Save connected tool to user model for persistence
            await fetch('/api/services/tools', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                tool: service.id,
                connected: true
              }),
            });
            
            // Update connected tools
            if (typeof onToolsConnected === 'function') {
              onToolsConnected({ [service.id]: true });
            }
          } else {
            // Handle failed or pending connection
            throw new Error('Connection not active after redirect');
          }
        } catch (error: any) {
          console.error('Error checking redirected auth status:', error);
          
          // Set error message
          setServiceErrors(prev => ({
            ...prev,
            [service.id]: 'Connection could not be verified after redirection.'
          }));
          
          // Reset loading
          setServices(prev =>
            prev.map(s =>
              s.id === service.id ? { 
                ...s, 
                isConnected: false, 
                isLoading: false,
                connectionStatus: 'failed'
              } : s
            )
          );
        } finally {
          // Remove from active connections
          setActiveConnections(prev => {
            const newSet = new Set(prev);
            newSet.delete(service.id);
            return newSet;
          });
        }
      };
      
      checkStatus();
    } catch (e) {
      console.error('Error processing pending auth:', e);
      sessionStorage.removeItem('pendingAuth');
    }
  }, [onToolsConnected]);

  const handleServiceToggle = async (service: Service) => {
    // Prevent multiple connection attempts for the same service
    if (activeConnections.has(service.id)) {
      console.log(`Connection attempt for ${service.id} already in progress`);
      return;
    }
    
    // Clear any previous errors for this service
    setServiceErrors(prev => ({
      ...prev,
      [service.id]: ''
    }));
    
    try {
      if (!session?.user?.email) {
        console.error('No user email found');
        return;
      }

      // Add to active connections set
      setActiveConnections(prev => new Set(prev).add(service.id));

      // Set initial loading state
      setServices(prev =>
        prev.map(s =>
          s.id === service.id ? { 
            ...s, 
            isLoading: true, 
            connectionStatus: 'loading' 
          } : s
        )
      );

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

      if (!data.connectionId) {
        console.error('Invalid response data:', data);
        throw new Error('Invalid response from server');
      }

      // Variables to track popup state
      let popup: Window | null = null;
      let popupCheckInterval: NodeJS.Timeout | null = null;
      let popupClosedTime: number | null = null;

      // Handle authentication differently based on device type
      if (data.redirectUrl) {
        if (isMobile()) {
          // For mobile, open in same window and set a session flag
          sessionStorage.setItem('pendingAuth', JSON.stringify({
            serviceId: service.id,
            connectionId: data.connectionId,
            startTime: Date.now()
          }));
          
          // Open in same window - this will navigate away from current page
          window.location.href = data.redirectUrl;
          return; // Early return as we're navigating away
        } else {
          // Desktop popup logic
          const width = 600;
          const height = 600;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2;
          
          popup = window.open(
            data.redirectUrl,
            'Connect Service',
            `width=${width},height=${height},left=${left},top=${top}`
          );
          
          if (!popup) {
            throw new Error('Popup was blocked. Please allow popups for this site.');
          }
          
          // Set up a check to detect if the popup is closed by the user
          popupCheckInterval = setInterval(() => {
            if (popup && popup.closed) {
              if (popupCheckInterval) clearInterval(popupCheckInterval);
              
              // Record time when popup closed
              popupClosedTime = Date.now();
              
              // Update state to show verifying instead of just loading
              setServices(prev =>
                prev.map(s =>
                  s.id === service.id ? { 
                    ...s, 
                    isLoading: true,
                    connectionStatus: 'verifying' 
                  } : s
                )
              );
              
              console.log("Authorization popup was closed, verifying if auth completed...");
            }
          }, 1000);
        }
      } else {
        console.log('No redirect needed, connection might be instant.');
      }

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

        // Set timeout values
        const startTime = Date.now();
        const maxTimeout = 120 * 1000; // 2 minutes maximum total time
        const popupClosedTimeout = 7 * 1000; // 7 seconds after popup closes (reduced from 30 seconds)
        const interval = 5000; // 5 seconds

        const pollConnection = async () => {
          const status = await checkStatus();
          
          // If server returns a PENDING status with indication it needs more time
          if (status.status === 'PENDING' && status.needsMoreTime) {
            // Extend the grace period when server indicates it's still processing
            if (popupClosedTime !== null) {
              popupClosedTime = Date.now() - 15000; // Effectively extends the grace period
            }
          }
          
          if (status.status === 'ACTIVE') {
            console.log(`Success! Connection is ACTIVE. ID: ${status.connectionId}`);
            setServices(prev =>
              prev.map(s =>
                s.id === service.id ? { 
                  ...s, 
                  isConnected: true, 
                  isLoading: false,
                  connectionStatus: 'idle' 
                } : s
              )
            );
            
            // Save connected tool to user model for persistence
            await fetch('/api/services/tools', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                tool: service.id,
                connected: true
              }),
            });
            
            if (typeof onToolsConnected === 'function') {
              onToolsConnected({ [service.id]: true });
            } else {
              console.warn('onToolsConnected is not a function or not provided');
            }
            
            // Close popup if it's still open
            if (popup && !popup.closed) popup.close();
            
            return true;
          }

          // If popup was closed and we've waited for popupClosedTimeout additional time
          if (popupClosedTime !== null && (Date.now() - popupClosedTime > popupClosedTimeout)) {
            throw new Error('auth_window_closed');
          }
          
          // Overall timeout regardless of popup state
          if (Date.now() - startTime > maxTimeout) {
            throw new Error('timeout_exceeded');
          }

          return false;
        };

        // Start polling
        while (!(await pollConnection())) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }

      } catch (error: any) {
        console.error("Connection did not become active:", error);
        
        // Set user-friendly error message based on error type
        let errorMessage = "Failed to connect service";
        
        if (error.message === 'auth_window_closed') {
          errorMessage = "Authorization window closed before completion. Please try again and complete the process.";
        } else if (error.message === 'timeout_exceeded') {
          errorMessage = "Connection timed out. Please try again later.";
        }
        
        setServiceErrors(prev => ({
          ...prev,
          [service.id]: errorMessage
        }));
        
        // Reset the toggle if connection fails
        setServices(prev =>
          prev.map(s =>
            s.id === service.id ? { 
              ...s, 
              isConnected: false, 
              isLoading: false,
              connectionStatus: 'failed'
            } : s
          )
        );
        
        // Make sure popup is closed
        if (popup && !popup.closed) popup.close();
      } finally {
        // Cleanup interval if it's still running
        if (popupCheckInterval) clearInterval(popupCheckInterval);
      }
    } catch (error: any) {
      console.error('Error connecting service:', error);
      
      // Set generic error message
      setServiceErrors(prev => ({
        ...prev,
        [service.id]: error.message || 'Failed to connect service'
      }));
      
      // Reset the toggle if there's an error
      setServices(prev =>
        prev.map(s =>
          s.id === service.id ? { 
            ...s, 
            isConnected: false, 
            isLoading: false,
            connectionStatus: 'failed'
          } : s
        )
      );
    } finally {
      // Always remove from active connections set when done
      setActiveConnections(prev => {
        const newSet = new Set(prev);
        newSet.delete(service.id);
        return newSet;
      });
    }
  };

  const handleDisconnectService = async (service: Service) => {
    try {
      if (!session?.user?.email) {
        console.error('No user email found');
        return;
      }

      // Set loading state to true for this service
      setServices(prev =>
        prev.map(s =>
          s.id === service.id ? { 
            ...s, 
            isLoading: true,
            connectionStatus: 'loading'
          } : s
        )
      );

      // Save disconnected tool status to user model for persistence
      await fetch('/api/services/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: service.id,
          connected: false
        }),
      });

      // Update UI
      setServices(prev =>
        prev.map(s =>
          s.id === service.id ? { 
            ...s, 
            isConnected: false, 
            isLoading: false,
            connectionStatus: 'idle'
          } : s
        )
      );
      
      if (typeof onToolsConnected === 'function') {
        onToolsConnected({ [service.id]: false });
      }
    } catch (error) {
      console.error('Error disconnecting service:', error);
      // Reset the toggle state
      setServices(prev =>
        prev.map(s =>
          s.id === service.id ? { 
            ...s, 
            isLoading: false,
            connectionStatus: 'failed'
          } : s
        )
      );
      
      setServiceErrors(prev => ({
        ...prev,
        [service.id]: 'Failed to disconnect service'
      }));
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="bg-black text-white hover:bg-neutral-900">Connect Tools</Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col h-full">
        <SheetHeader>
          <SheetTitle>Available Services</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 w-full">
          {isLoading ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading connections...</span>
            </div>
          ) : (
            services.map((service) => (
              <div
                key={service.id}
                className="flex flex-col py-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{service.name}</span>
                  <div className="flex items-center">
                    {service.isLoading && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {service.connectionStatus === 'verifying' && (
                          <span className="text-xs text-gray-500 mr-2">Verifying...</span>
                        )}
                      </>
                    )}
                    <Switch
                      checked={service.isConnected}
                      onCheckedChange={() => 
                        service.isConnected 
                          ? handleDisconnectService(service)
                          : handleServiceToggle(service)
                      }
                      disabled={service.isLoading || activeConnections.has(service.id)}
                    />
                  </div>
                </div>
                {serviceErrors[service.id] && (
                  <div className="text-xs text-red-500 mt-1">
                    {serviceErrors[service.id]}
                  </div>
                )}
              </div>
            ))
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
} 
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function UpdateUserPreferencesButton() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleUpdatePreferences = async () => {
    console.log('[BUTTON] Update User Context button clicked');
    
    if (!session?.user) {
      console.log('[BUTTON] No user session found, aborting');
      return;
    }
    
    console.log('[BUTTON] User session found:', session.user.email);
    setIsLoading(true);
    
    try {
      console.log('[BUTTON] Sending request to /api/user/context');
      const response = await fetch('/api/user/context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          forceScan: false,
        }),
      });

      const data = await response.json();
      console.log('[BUTTON] API response:', data);

      if (!response.ok) {
        console.error('[BUTTON] API error:', data);
        throw new Error('Failed to update user context');
      }

      console.log('[BUTTON] Context update initiated successfully');
      toast({
        title: "Update initiated",
        description: "We're analyzing your conversations to learn your preferences and facts. This will happen in the background.",
        duration: 5000,
      });
    } catch (error) {
      console.error('[BUTTON] Error updating user context:', error);
      toast({
        title: "Error",
        description: "There was a problem updating your preferences and facts. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
      console.log('[BUTTON] Request completed, loading state reset');
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleUpdatePreferences}
      disabled={isLoading}
    >
      {isLoading ? 'Updating...' : 'Update User Context'}
    </Button>
  );
} 
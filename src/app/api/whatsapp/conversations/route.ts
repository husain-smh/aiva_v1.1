import { NextRequest, NextResponse } from 'next/server';
import { OpenAIToolSet } from 'composio-core';
import { getServerSession } from 'next-auth';
import { COMPOSIO_ACTIONS } from '@/lib/composio';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized: User not authenticated' },
        { status: 401 }
      );
    }
    
    // Initialize Composio toolset
    const toolset = new OpenAIToolSet({
      apiKey: process.env.COMPOSIO_API_KEY,
    });
    
    // Get the user entity
    const entity = await toolset.getEntity(session.user.email);
    
    // Get WhatsApp conversations
    const result = await entity.execute({
      actionId: COMPOSIO_ACTIONS.WHATSAPP_GET_CONVERSATIONS,
      input: {} // No additional parameters needed
    });
    
    return NextResponse.json({
      success: true,
      conversations: result.conversations || []
    });
  } catch (error) {
    console.error('WhatsApp get conversations error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get WhatsApp conversations',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 
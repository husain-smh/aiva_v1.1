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
    
    // Get conversation ID from query parameters
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing required parameter: conversationId' },
        { status: 400 }
      );
    }
    
    // Initialize Composio toolset
    const toolset = new OpenAIToolSet({
      apiKey: process.env.COMPOSIO_API_KEY,
    });
    
    // Get the user entity
    const entity = await toolset.getEntity(session.user.email);
    
    // Get messages from the conversation
    const result = await entity.execute({
      actionId: COMPOSIO_ACTIONS.WHATSAPP_GET_MESSAGES,
      input: {
        conversationId: conversationId
      }
    });
    
    return NextResponse.json({
      success: true,
      conversationId: conversationId,
      messages: result.messages || []
    });
  } catch (error) {
    console.error('WhatsApp get messages error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get WhatsApp messages',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 
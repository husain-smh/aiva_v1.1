import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { OpenAIToolSet } from 'composio-core';

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { service, integration_id } = await req.json();
    
    if (!integration_id) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      );
    }

    // Initialize Composio
    const toolset = new OpenAIToolSet({
      apiKey: process.env.COMPOSIO_API_KEY,
    });

    // Initiate the connection
    const connectionRequest = await toolset.connectedAccounts.initiate({
      integrationId: integration_id,
      entityId: session.user.email,
      redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/chat`,
    });

    if (!connectionRequest?.redirectUrl) {
      return NextResponse.json(
        { error: 'Failed to get redirect URL from Composio' },
        { status: 500 }
      );
    }

    if (!connectionRequest?.connectedAccountId) {
      return NextResponse.json(
        { error: 'Failed to get connection ID from Composio' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      redirectUrl: connectionRequest.redirectUrl,
      connectionId: connectionRequest.connectedAccountId 
    });
  } catch (error) {
    console.error('Error connecting service:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to connect service',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 
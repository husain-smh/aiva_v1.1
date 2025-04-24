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
      throw new Error('Failed to get redirect URL');
    }

    return NextResponse.json({ 
      redirectUrl: connectionRequest.redirectUrl,
      connectionId: connectionRequest.id 
    });
  } catch (error) {
    console.error('Error connecting service:', error);
    return NextResponse.json(
      { error: 'Failed to connect service' },
      { status: 500 }
    );
  }
} 
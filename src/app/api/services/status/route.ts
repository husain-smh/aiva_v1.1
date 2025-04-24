import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { OpenAIToolSet } from 'composio-core';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    // Initialize Composio
    const toolset = new OpenAIToolSet({
      apiKey: process.env.COMPOSIO_API_KEY,
    });

    // Get connection status
    const connection = await toolset.connectedAccounts.get({
      connectedAccountId: connectionId
    });

    return NextResponse.json({
      status: connection.status,
      connectionId: connection.id
    });
  } catch (error) {
    console.error('Error checking connection status:', error);
    return NextResponse.json(
      { error: 'Failed to check connection status' },
      { status: 500 }
    );
  }
} 
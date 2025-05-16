import { NextRequest, NextResponse } from 'next/server';
import Composio from '@composio/client';
import { OpenAIToolSet } from "composio-core";

const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY!,
  environment: 'production', // or 'staging'
});

export async function POST(req: NextRequest) {
  try {
    const { userId, tool } = await req.json();

    if (!userId || !tool) {
      return NextResponse.json({ error: 'Missing userId or tool' }, { status: 400 });
    }
    const toolset = new OpenAIToolSet();
    const entity = await toolset.getEntity(userId); // Example
    // Get Composio Entity object (represents your user)
    console.log(`Initiating OAuth connection for entity ${userId}...`);
    const connectionRequest = await toolset.connectedAccounts.initiate({
        integrationId: process.env.YOUR_INTEGRATION_ID,
        entityId: userId,
        redirectUri: `${process.env.FRONTEND_URL}/chat`,
      });
      


      if (connectionRequest?.redirectUrl) {
        console.log(`Received redirect URL: ${connectionRequest.redirectUrl}`);
        return NextResponse.json({ redirectUrl: connectionRequest.redirectUrl });

        // Proceed to Step 2: Redirect the user
        // Return or pass connectionRequest to the next stage
    } else {
        console.error("Error: Expected a redirectUrl for OAuth flow but didn't receive one.");
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
        // Handle error
    }
    // Initiate connection using app name (e.g., 'gmail')
    // const connection = await entity.initiateConnection({appName: 'gmail'});
    
    // return NextResponse.json({ redirectUrl: connection.redirectUrl });
  } catch (error) {
    console.error('Connect error:', error);
    return NextResponse.json({ error: 'Failed to initiate connection' }, { status: 500 });
  }
}

// /app/api/composio/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OpenAIToolSet } from 'composio-core';

export async function GET(req: NextRequest) {
  const entityId = req.nextUrl.searchParams.get("entityId");

  if (!entityId) {
    return NextResponse.json({ error: "Missing entityId" }, { status: 400 });
  }

  const toolset = new OpenAIToolSet();
  const connection = await toolset.connectedAccounts.getLatest({ entityId });

  try {
    const activeConnection = await connection.waitUntilActive(180);
    console.log(`Connection active: ${activeConnection.id}`);

    // TODO: Store activeConnection.id in DB for the user

    return NextResponse.redirect(`${process.env.FRONTEND_URL}/chat`);
  } catch (err) {
    console.error("Activation failed:", err);
    return NextResponse.redirect(`${process.env.FRONTEND_URL}/error`);
  }
}

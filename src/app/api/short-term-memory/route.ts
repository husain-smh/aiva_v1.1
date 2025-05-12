import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createShortTermMemory } from '@/lib/shortTermMemory';
import { Chat } from '@/models/Chat';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    
    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    // Connect to database
    await connectToDatabase();

    // Get user ID from session or find by email if not available
    let userId = session.user._id;
    
    if (!userId && session.user.email) {
      const userFromDB = await User.findOne({ email: session.user.email });
      if (userFromDB) {
        userId = userFromDB._id.toString();
      } else {
        userId = session.user.email;
      }
    }

    // Verify the chat belongs to the user
    const chat = await Chat.findOne({
      _id: chatId,
      userId: userId,
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Get short-term memory for this chat
    const shortTermMemory = createShortTermMemory(chatId, chat.agentId?.toString());
    const recentMessages = await shortTermMemory.getRecentMessages();
    const contextString = await shortTermMemory.getContextString();

    return NextResponse.json({
      chatId,
      agentId: chat.agentId,
      recentMessages,
      contextString,
      messageCount: recentMessages.length
    });
  } catch (error) {
    console.error('Error retrieving short-term memory:', error);
    return NextResponse.json(
      { error: 'Error retrieving short-term memory' },
      { status: 500 }
    );
  }
} 
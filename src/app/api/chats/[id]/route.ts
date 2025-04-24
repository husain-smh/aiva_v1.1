import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Message } from '@/models/Message';
import { Chat } from '@/models/Chat';
import { User } from '@/models/User';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chatId = params.id;
    await connectToDatabase();

    // Get user ID from session or find by email if not available
    let userId = session.user._id;
    
    // Only use the fallback mechanism if _id is missing
    if (!userId && session.user.email) {
      console.log('Chat by ID API - _id missing, using email fallback');
      const userFromDB = await User.findOne({ email: session.user.email });
      
      if (userFromDB) {
        userId = userFromDB._id.toString();
      } else {
        userId = session.user.email; // Last resort fallback
      }
    } else {
      console.log('Chat by ID API - Using session user._id:', userId);
    }

    // Verify the chat belongs to the user
    const chat = await Chat.findOne({
      _id: chatId,
      userId: userId,
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const messages = await Message.find({ chatId })
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({
      chat,
      messages,
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Error fetching chat messages' },
      { status: 500 }
    );
  }
} 
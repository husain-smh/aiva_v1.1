import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Message } from '@/models/Message';
import { Chat } from '@/models/Chat';

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

    // Verify the chat belongs to the user
    const chat = await Chat.findOne({
      _id: chatId,
      userId: session.user.id,
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
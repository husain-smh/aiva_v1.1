import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Message } from '@/models/Message';
import { Chat } from '@/models/Chat';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, chatId } = await request.json();
    await connectToDatabase();

    let currentChatId = chatId;

    // If no chatId provided, create a new chat
    if (!currentChatId) {
      const newChat = await Chat.create({
        userId: session.user.id,
        title: content.substring(0, 30) + '...',
      });
      currentChatId = newChat._id.toString();
    }

    // Save user message
    const userMessage = await Message.create({
      chatId: currentChatId,
      role: 'user',
      content,
    });

    // Generate assistant response
    const assistantMessageText = `This is a simulated response to: "${content}"`;

    // Save assistant message
    const assistantMessage = await Message.create({
      chatId: currentChatId,
      role: 'assistant',
      content: assistantMessageText,
    });

    return NextResponse.json({
      userMessage,
      assistantMessage,
      chatId: currentChatId,
    });
  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json(
      { error: 'Error processing message' },
      { status: 500 }
    );
  }
} 
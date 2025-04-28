import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Message } from '@/models/Message';
import { Chat } from '@/models/Chat';
import { User } from '@/models/User';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: chatId } = await params;
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: chatId } = await params;
    const { title } = await request.json();

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required and must be a string' },
        { status: 400 }
      );
    }

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

    // Verify the chat belongs to the user and update it
    const chat = await Chat.findOneAndUpdate(
      {
        _id: chatId,
        userId: userId,
      },
      { title },
      { new: true }
    );

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json(chat);
  } catch (error) {
    console.error('Error renaming chat:', error);
    return NextResponse.json(
      { error: 'Error renaming chat' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: chatId } = await params;
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

    // Delete all messages in the chat
    await Message.deleteMany({ chatId });

    // Delete the chat
    const result = await Chat.findOneAndDelete({
      _id: chatId,
      userId: userId,
    });

    if (!result) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { error: 'Error deleting chat' },
      { status: 500 }
    );
  }
} 
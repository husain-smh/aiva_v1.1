import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Chat } from '@/models/Chat';
import { User } from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Get user ID from session or find by email if not available
    let userId = session.user._id;
    
    // Only use the fallback mechanism if _id is missing
    if (!userId && session.user.email) {
      console.log('Chats API - _id missing, using email fallback');
      const userFromDB = await User.findOne({ email: session.user.email });
      
      if (userFromDB) {
        userId = userFromDB._id.toString();
      } else {
        userId = session.user.email; // Last resort fallback
      }
    } else {
      console.log('Chats API - Using session user._id:', userId);
    }

    const chats = await Chat.find({ userId: userId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json(
      { error: 'Error fetching chats' },
      { status: 500 }
    );
  }
} 
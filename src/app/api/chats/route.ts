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

    // Log session details
    console.log('Chats API - Session user email:', session.user.email);
    console.log('Chats API - Session user _id:', session.user._id);
    console.log('Chats API - All user properties:', Object.keys(session.user));

    // If _id is missing, try to find the user by email
    let userId = session.user._id;
    if (!userId && session.user.email) {
      console.log('Chats API - Attempting to find user by email as fallback');
      const userFromDB = await User.findOne({ email: session.user.email });
      
      if (userFromDB) {
        console.log('Chats API - Found user in DB by email:', userFromDB._id);
        userId = userFromDB._id.toString();
      } else {
        userId = session.user.email;
      }
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
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
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

    const agentId = params.id;
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

    // Fetch chats for this agent that belong to the user
    const chats = await Chat.find({ 
      userId: userId,
      agentId: agentId 
    })
    .sort({ createdAt: -1 })
    .lean();

    return NextResponse.json(chats);
  } catch (error) {
    console.error('Error fetching agent chats:', error);
    return NextResponse.json(
      { error: 'Error fetching agent chats' },
      { status: 500 }
    );
  }
} 
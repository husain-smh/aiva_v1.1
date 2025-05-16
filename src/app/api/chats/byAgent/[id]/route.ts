import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Chat } from '@/models/Chat';
import { User } from '@/models/User';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params; // ✅ await the promise

  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Determine user ID
    let userId = session.user._id;

    if (!userId && session.user.email) {
      const userFromDB = await User.findOne({ email: session.user.email });
      userId = userFromDB?._id?.toString() ?? session.user.email;
    }

    const chats = await Chat.find({
      userId,
      agentId: id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(chats);
  } catch (error) {
    console.error('Error fetching agent chats:', error);
    return NextResponse.json({ error: 'Error fetching agent chats' }, { status: 500 });
  }
}

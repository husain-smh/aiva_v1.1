import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Agent } from '@/models/Agent';
import { User } from '@/models/User';



// Get all agents for the current user


export async function GET() {
    try {
      const session = await getServerSession();
      
      if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      await connectToDatabase();
      
      // Find the user
      const user = await User.findOne({ email: session.user.email });
      
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      // Find all agents for this user
      const agents = await Agent.find({ userId: user._id });
      
      return NextResponse.json({ agents });
    } catch (error) {
      console.error('Error fetching agents:', error);
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }
  }
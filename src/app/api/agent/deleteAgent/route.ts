import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Agent } from '@/models/Agent';
import { User } from '@/models/User';

// Delete an agent
export async function DELETE(
    request: NextRequest,
  ) {
    try {
      const body = await request.json(); // Read JSON body
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
      }
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
      
      // Delete the agent
      const result = await Agent.findOneAndDelete({
        _id: id,
        userId: user._id
      });
      
      if (!result) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting agent:', error);
      return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
    }
  }
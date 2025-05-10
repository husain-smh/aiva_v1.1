import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Agent } from '@/models/Agent';
import { User } from '@/models/User';



// Create a new agent
export async function POST(request: NextRequest) {
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
    
    // Parse request body
    const { name, description, context, instructions, connectedApps } = await request.json();
    
    // Validate required fields
    if (!name || !description || !context || !instructions) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Create new agent
    const newAgent = await Agent.create({
      name,
      description,
      context,
      instructions,
      connectedApps: connectedApps || [],
      userId: user._id
    });
    
    return NextResponse.json({ agent: newAgent }, { status: 201 });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}
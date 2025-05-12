import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Agent } from '@/models/Agent';
import { User } from '@/models/User';

// Update an agent - supports both PUT (with params) and PATCH (with id in body)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return updateAgent(request, params?.id);
}

// Add PATCH method to support updating with id in body
export async function PATCH(
  request: NextRequest
) {
  return updateAgent(request);
}

// Shared handler for both PUT and PATCH
async function updateAgent(
  request: NextRequest,
  paramId?: string
) {
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
    const updates = await request.json();
    
    // Use the id from params if available, otherwise get it from the body
    const agentId = paramId || updates.id;
    
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }
    
    // Find and update the agent
    const updatedAgent = await Agent.findOneAndUpdate(
      { _id: agentId, userId: user._id },
      updates,
      { new: true }
    );
    
    if (!updatedAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    
    return NextResponse.json({ agent: updatedAgent });
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}


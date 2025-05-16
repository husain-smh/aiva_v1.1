import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

// Helper function to get the userId
async function getUserId(session: any): Promise<string | null> {
  // Get user ID from session
  let userId = session?.user?._id;
  
  // If no userId in session, try to find by email
  if (!userId && session?.user?.email) {
    await connectToDatabase();
    const userFromDB = await User.findOne({ email: session.user.email });
    
    if (userFromDB) {
      userId = userFromDB._id.toString();
    }
  }
  
  return userId || null;
}

// GET /api/services/tools - Get list of connected tools for the current user
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user with connected apps
    await connectToDatabase();
    const user = await User.findOne(
      { email: session.user.email },
      { connectedApps: 1 }
    );
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      connectedTools: user.connectedApps || [] 
    });
  } catch (error) {
    console.error('Error getting connected tools:', error);
    return NextResponse.json(
      { error: 'Failed to get connected tools' },
      { status: 500 }
    );
  }
}

// POST /api/services/tools - Update a tool's connection status
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tool and connection status from request
    const { tool, connected } = await request.json();
    
    if (!tool) {
      return NextResponse.json(
        { error: 'Tool ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    if (connected) {
      // Add tool to connectedApps if not already present
      await User.updateOne(
        { email: session.user.email },
        { $addToSet: { connectedApps: tool } }
      );
    } else {
      // Remove tool from connectedApps
      await User.updateOne(
        { email: session.user.email },
        { $pull: { connectedApps: tool } }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: connected ? `${tool} connected successfully` : `${tool} disconnected successfully`
    });
  } catch (error) {
    console.error('Error updating tool connection:', error);
    return NextResponse.json(
      { error: 'Failed to update tool connection' },
      { status: 500 }
    );
  }
} 
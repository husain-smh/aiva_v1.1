import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { scanUserChats } from '@/lib/extractionService';
import { User } from '@/models/User';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract parameters from request
    const body = await request.json();
    const forceScan = body.forceScan === true;
    
    // Get user ID from session or find by email if not available
    let userId = session.user._id;
    
    if (!userId && session.user.email) {
      await connectToDatabase();
      const userFromDB = await User.findOne({ email: session.user.email });
      
      if (userFromDB) {
        userId = userFromDB._id.toString();
      } else {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // Forward the request to the new API endpoint
    const forwardResponse = await fetch(`${request.nextUrl.origin}/api/user/context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ forceScan }),
    });
    
    const responseData = await forwardResponse.json();
    
    // Return response with a deprecation notice
    return NextResponse.json(
      { 
        ...responseData,
        note: 'This endpoint is deprecated. Please use /api/user/context instead.'
      }, 
      { status: forwardResponse.status }
    );
  } catch (error) {
    console.error('Error triggering preference extraction:', error);
    return NextResponse.json(
      { error: 'Error processing request' },
      { status: 500 }
    );
  }
}

// GET route to check extraction status and get summary
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from session or find by email if not available
    let userId = session.user._id;
    
    if (!userId && session.user.email) {
      await connectToDatabase();
      const userFromDB = await User.findOne({ email: session.user.email });
      
      if (userFromDB) {
        userId = userFromDB._id.toString();
      } else {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // Get counts of preferences and facts for this user
    await connectToDatabase();
    
    // Call the new API endpoint
    const contextResponse = await fetch(`${request.nextUrl.origin}/api/user/context/head?userId=${userId}`, {
      method: 'HEAD',
    }).then(res => res.json());
    
    return NextResponse.json({
      preferences: contextResponse.preferences || 0,
      facts: contextResponse.facts || 0,
      userId,
      note: 'This endpoint is deprecated. Please use /api/user/context instead.'
    });
  } catch (error) {
    console.error('Error getting extraction status:', error);
    return NextResponse.json(
      { error: 'Error processing request' },
      { status: 500 }
    );
  }
} 
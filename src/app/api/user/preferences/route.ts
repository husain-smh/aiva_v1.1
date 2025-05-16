import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { UserPreference } from '@/models/UserPreference';
import { User } from '@/models/User';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from session or URL param
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId') || session.user._id;
    
    // If no userId in session, try to find by email
    if (!userId && session.user.email) {
      await connectToDatabase();
      const userFromDB = await User.findOne({ email: session.user.email });
      
      if (userFromDB) {
        userId = userFromDB._id.toString();
      } else {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // Check access control - users should only access their own preferences
    // (unless they have admin privileges)
    const requestedUserId = searchParams.get('userId');
    if (requestedUserId && requestedUserId !== userId) {
      // Check if current user is an admin (implement your own logic)
      const isAdmin = false; // Replace with actual admin check
      
      if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
      }
    }

    // Forward to new API
    const forwardResponse = await fetch(`${request.nextUrl.origin}/api/user/context?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const responseData = await forwardResponse.json();
    
    // Format for API response to match old format
    const formattedPreferences = Object.entries(responseData.preferences || {}).map(([key, value]) => ({
      key,
      value,
      confidence: 1.0,
      timestamp: responseData.lastUpdated?.preferences || new Date()
    }));
    
    return NextResponse.json({ 
      preferences: formattedPreferences,
      note: 'This endpoint is deprecated. Please use /api/user/context instead.'
    });
  } catch (error) {
    console.error('Error retrieving user preferences:', error);
    return NextResponse.json(
      { error: 'Error processing request' },
      { status: 500 }
    );
  }
}

// Count endpoint
export async function HEAD(request: NextRequest) {
  try {
    // Get user ID from URL param
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Forward to new API
    const forwardResponse = await fetch(`${request.nextUrl.origin}/api/user/context/head?userId=${userId}`, {
      method: 'HEAD',
    });
    
    const responseData = await forwardResponse.json();
    
    return NextResponse.json({ 
      count: responseData.preferences || 0,
      note: 'This endpoint is deprecated. Please use /api/user/context/head instead.'
    });
  } catch (error) {
    console.error('Error counting user preferences:', error);
    return NextResponse.json(
      { error: 'Error processing request' },
      { status: 500 }
    );
  }
}


// Update or delete a preference
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from session or find by email
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

    // Get preference data from request
    const body = await request.json();
    const { key, value, delete: shouldDelete } = body;
    
    if (!key) {
      return NextResponse.json({ error: 'Preference key is required' }, { status: 400 });
    }

    if (shouldDelete) {
      // Delete the preference using the new API
      const deleteResponse = await fetch(`${request.nextUrl.origin}/api/user/context?preferences=${key}`, {
        method: 'DELETE',
      });
      
      const responseData = await deleteResponse.json();
      
      return NextResponse.json({ 
        message: 'Preference deleted successfully',
        note: 'This endpoint is deprecated. Please use /api/user/context DELETE instead.'
      });
    } else {
      // Update or create the preference using the new API
      if (!value && value !== false && value !== 0) {
        return NextResponse.json({ error: 'Preference value is required' }, { status: 400 });
      }
      
      // ✅ FIXED: Typed preferences object
      const preferences: Record<string, any> = {};
      preferences[key] = value;
      
      const updateResponse = await fetch(`${request.nextUrl.origin}/api/user/context`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences }),
      });
      
      const responseData = await updateResponse.json();
      
      return NextResponse.json({ 
        message: 'Preference updated successfully',
        note: 'This endpoint is deprecated. Please use /api/user/context PUT instead.'
      });
    }
  } catch (error) {
    console.error('Error updating user preference:', error);
    return NextResponse.json(
      { error: 'Error processing request' },
      { status: 500 }
    );
  }
}

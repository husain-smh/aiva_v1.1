import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { UserPreference } from '@/models/UserPreference';
import { UserFact } from '@/models/UserFact';
import { User } from '@/models/User';
import { connectToDatabase } from '@/lib/mongodb';
import { scanUserChats } from '@/lib/extractionService';

// Helper function to get userId from session or request
async function getUserId(session: any, request?: NextRequest): Promise<string | null> {
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
  
  // If request is provided, check for userId in query params
  if (request && !userId) {
    const { searchParams } = new URL(request.url);
    userId = searchParams.get('userId');
  }
  
  return userId || null;
}

// GET /api/user/context - Get all user preferences and facts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserId(session, request);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user preferences and facts
    await connectToDatabase();
    const userPreference = await UserPreference.findOne({ userId });
    const userFact = await UserFact.findOne({ userId });
    
    // Convert Map objects to plain objects for JSON response
    const preferences = userPreference?.preferences instanceof Map
      ? Object.fromEntries(userPreference.preferences)
      : userPreference?.preferences || {};
      
    const facts = userFact?.facts instanceof Map
      ? Object.fromEntries(userFact.facts)
      : userFact?.facts || {};
    
    return NextResponse.json({
      preferences,
      facts,
      lastUpdated: {
        preferences: userPreference?.lastUpdated || null,
        facts: userFact?.lastUpdated || null
      }
    });
  } catch (error) {
    console.error('Error retrieving user context:', error);
    return NextResponse.json(
      { error: 'Error processing request' },
      { status: 500 }
    );
  }
}

// POST /api/user/context - Update user context by scanning chats
export async function POST(request: NextRequest) {
  try {
    console.log('[API] POST /api/user/context - Request received');
    const session = await getServerSession();
    
    if (!session || !session.user) {
      console.log('[API] Unauthorized request - No valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract parameters from request
    const body = await request.json();
    const forceScan = body.forceScan === true;
    console.log(`[API] Request body:`, JSON.stringify(body, null, 2));
    
    const userId = await getUserId(session);
    if (!userId) {
      console.log('[API] User not found - No valid userId');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log(`[API] Processing request for user: ${userId}, forceScan: ${forceScan}`);

    // Process in the background
    // For production, you might want to use a queue or background job system
    console.log(`[API] Starting scanUserChats for user: ${userId}`);
    const scanPromise = scanUserChats(userId, forceScan);
    console.log(`[API] Scan process initiated in background`);
    
    // Return immediately with a 202 Accepted status
    return NextResponse.json(
      { 
        message: 'Context extraction process started', 
        userId 
      }, 
      { status: 202 }
    );
  } catch (error) {
    console.error('[API] Error triggering context extraction:', error);
    return NextResponse.json(
      { error: 'Error processing request' },
      { status: 500 }
    );
  }
}

// PUT /api/user/context - Manually update specific preferences or facts
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get data from request
    const body = await request.json();
    const { preferences, facts } = body;
    
    await connectToDatabase();
    let updates = { preferences: 0, facts: 0 };
    
    // Update preferences if provided
    if (preferences && Object.keys(preferences).length > 0) {
      const userPreference = await UserPreference.findOne({ userId });
      
      if (!userPreference) {
        console.log(`[API] Creating new preference document for user: ${userId}`);
        // Create new preferences document with a Map
        const preferencesMap = new Map();
        for (const [key, value] of Object.entries(preferences)) {
          preferencesMap.set(key, value);
        }
        
        await UserPreference.create({
          userId,
          preferences: preferencesMap,
          lastUpdated: new Date()
        });
        updates.preferences = Object.keys(preferences).length;
      } else {
        console.log(`[API] Updating existing preference document for user: ${userId}`);
        // Update existing preference document
        // Make sure preferences is a Map
        if (!userPreference.preferences) {
          userPreference.preferences = new Map();
        } else if (!(userPreference.preferences instanceof Map)) {
          // Convert to Map if it's not already
          userPreference.preferences = new Map(Object.entries(userPreference.preferences));
        }
        
        for (const [key, value] of Object.entries(preferences)) {
          console.log(`[API] Setting preference: ${key} = ${value}`);
          userPreference.preferences.set(key, value);
          updates.preferences++;
        }
        userPreference.lastUpdated = new Date();
        
        const saveResult = await userPreference.save();
        console.log(`[API] Preferences saved successfully, document ID: ${saveResult._id}`);
        
        // Log the saved preferences
        const savedPreference = await UserPreference.findById(saveResult._id);
        const savedPrefs = savedPreference?.preferences instanceof Map 
          ? Object.fromEntries(savedPreference.preferences)
          : savedPreference?.preferences || {};
        
        console.log(`[API] Saved preferences:`, JSON.stringify(savedPrefs, null, 2));
      }
    }
    
    // Update facts if provided
    if (facts && Object.keys(facts).length > 0) {
      const userFact = await UserFact.findOne({ userId });
      
      if (!userFact) {
        console.log(`[API] Creating new facts document for user: ${userId}`);
        // Create new facts document with a Map
        const factsMap = new Map();
        for (const [key, value] of Object.entries(facts)) {
          factsMap.set(key, value);
        }
        
        await UserFact.create({
          userId,
          facts: factsMap,
          lastUpdated: new Date()
        });
        updates.facts = Object.keys(facts).length;
      } else {
        console.log(`[API] Updating existing facts document for user: ${userId}`);
        // Update existing facts document
        // Make sure facts is a Map
        if (!userFact.facts) {
          userFact.facts = new Map();
        } else if (!(userFact.facts instanceof Map)) {
          // Convert to Map if it's not already
          userFact.facts = new Map(Object.entries(userFact.facts));
        }
        
        for (const [key, value] of Object.entries(facts)) {
          console.log(`[API] Setting fact: ${key} = ${value}`);
          userFact.facts.set(key, value);
          updates.facts++;
        }
        userFact.lastUpdated = new Date();
        
        const saveResult = await userFact.save();
        console.log(`[API] Facts saved successfully, document ID: ${saveResult._id}`);
        
        // Log the saved facts
        const savedFact = await UserFact.findById(saveResult._id);
        const savedFacts = savedFact?.facts instanceof Map 
          ? Object.fromEntries(savedFact.facts)
          : savedFact?.facts || {};
        
        console.log(`[API] Saved facts:`, JSON.stringify(savedFacts, null, 2));
      }
    }
    
    return NextResponse.json({ 
      message: 'User context updated successfully',
      updates
    });
  } catch (error) {
    console.error('Error updating user context:', error);
    return NextResponse.json(
      { error: 'Error processing request' },
      { status: 500 }
    );
  }
}

// DELETE /api/user/context - Delete specific preferences or facts
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get keys to delete from query params
    const { searchParams } = new URL(request.url);
    const preferenceKeys = searchParams.get('preferences')?.split(',') || [];
    const factKeys = searchParams.get('facts')?.split(',') || [];
    
    console.log(`[API] DELETE request - preferences to delete: ${preferenceKeys.join(', ')}`);
    console.log(`[API] DELETE request - facts to delete: ${factKeys.join(', ')}`);
    
    await connectToDatabase();
    let deleted = { preferences: 0, facts: 0 };
    
    // Delete preferences if specified
    if (preferenceKeys.length > 0) {
      const userPreference = await UserPreference.findOne({ userId });
      if (userPreference) {
        console.log(`[API] Found preferences document for user: ${userId}`);
        
        // Ensure preferences is a Map
        if (!(userPreference.preferences instanceof Map) && userPreference.preferences) {
          userPreference.preferences = new Map(Object.entries(userPreference.preferences));
        }
        
        if (userPreference.preferences) {
          for (const key of preferenceKeys) {
            console.log(`[API] Attempting to delete preference: ${key}`);
            if (userPreference.preferences.has(key)) {
              userPreference.preferences.delete(key);
              deleted.preferences++;
              console.log(`[API] Deleted preference: ${key}`);
            } else {
              console.log(`[API] Preference not found: ${key}`);
            }
          }
          userPreference.lastUpdated = new Date();
          
          const saveResult = await userPreference.save();
          console.log(`[API] Preferences updated after deletion, document ID: ${saveResult._id}`);
          
          // Log the updated preferences
          const savedPreference = await UserPreference.findById(saveResult._id);
          const updatedPrefs = savedPreference?.preferences instanceof Map 
            ? Object.fromEntries(savedPreference.preferences)
            : savedPreference?.preferences || {};
          
          console.log(`[API] Updated preferences after deletion:`, JSON.stringify(updatedPrefs, null, 2));
        }
      } else {
        console.log(`[API] No preferences document found for user: ${userId}`);
      }
    }
    
    // Delete facts if specified
    if (factKeys.length > 0) {
      const userFact = await UserFact.findOne({ userId });
      if (userFact) {
        console.log(`[API] Found facts document for user: ${userId}`);
        
        // Ensure facts is a Map
        if (!(userFact.facts instanceof Map) && userFact.facts) {
          userFact.facts = new Map(Object.entries(userFact.facts));
        }
        
        if (userFact.facts) {
          for (const key of factKeys) {
            console.log(`[API] Attempting to delete fact: ${key}`);
            if (userFact.facts.has(key)) {
              userFact.facts.delete(key);
              deleted.facts++;
              console.log(`[API] Deleted fact: ${key}`);
            } else {
              console.log(`[API] Fact not found: ${key}`);
            }
          }
          userFact.lastUpdated = new Date();
          
          const saveResult = await userFact.save();
          console.log(`[API] Facts updated after deletion, document ID: ${saveResult._id}`);
          
          // Log the updated facts
          const savedFact = await UserFact.findById(saveResult._id);
          const updatedFacts = savedFact?.facts instanceof Map 
            ? Object.fromEntries(savedFact.facts)
            : savedFact?.facts || {};
          
          console.log(`[API] Updated facts after deletion:`, JSON.stringify(updatedFacts, null, 2));
        }
      } else {
        console.log(`[API] No facts document found for user: ${userId}`);
      }
    }
    
    return NextResponse.json({ 
      message: 'User context entries deleted successfully',
      deleted
    });
  } catch (error) {
    console.error('Error deleting user context entries:', error);
    return NextResponse.json(
      { error: 'Error processing request' },
      { status: 500 }
    );
  }
}

// HEAD /api/user/context - Get counts of preferences and facts
export async function HEAD(request: NextRequest) {
  try {
    // Get user ID from URL param
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Count preferences and facts
    await connectToDatabase();
    const userPreference = await UserPreference.findOne({ userId });
    const userFact = await UserFact.findOne({ userId });
    
    // Count entries in the Maps
    let preferenceCount = 0;
    let factCount = 0;
    
    if (userPreference?.preferences) {
      preferenceCount = userPreference.preferences instanceof Map 
        ? userPreference.preferences.size
        : Object.keys(userPreference.preferences).length;
    }
    
    if (userFact?.facts) {
      factCount = userFact.facts instanceof Map
        ? userFact.facts.size
        : Object.keys(userFact.facts).length;
    }
    
    return NextResponse.json({ 
      preferences: preferenceCount,
      facts: factCount
    });
  } catch (error) {
    console.error('Error counting user context entries:', error);
    return NextResponse.json(
      { error: 'Error processing request' },
      { status: 500 }
    );
  }
} 
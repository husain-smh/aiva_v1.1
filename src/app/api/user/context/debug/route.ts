import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';
import { UserPreference } from '@/models/UserPreference';
import { UserFact } from '@/models/UserFact';

// Debug endpoint to check MongoDB collections
export async function GET(request: NextRequest) {
  try {
    // For security, only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Debug endpoint not available in production' }, { status: 403 });
    }
    
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to the database
    await connectToDatabase();
    
    // Get collections names
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Find userpreferences and userfacts collections
    const hasUserPrefs = collectionNames.includes('userpreferences');
    const hasUserFacts = collectionNames.includes('userfacts');
    
    console.log('[DEBUG] Available collections:', collectionNames);
    
    // Fetch raw data from the collections
    let rawUserPreferences = [];
    let rawUserFacts = [];
    let formattedUserPreferences = [];
    let formattedUserFacts = [];
    
    if (hasUserPrefs) {
      // Get raw data
      rawUserPreferences = await mongoose.connection.db.collection('userpreferences').find({}).toArray();
      console.log('[DEBUG] User preferences count:', rawUserPreferences.length);
      
      // Get formatted data using the model
      const userPreferences = await UserPreference.find({});
      formattedUserPreferences = userPreferences.map(pref => {
        // Convert Map to plain object
        const preferences = pref.preferences instanceof Map 
          ? Object.fromEntries(pref.preferences)
          : pref.preferences || {};
          
        return {
          _id: pref._id.toString(),
          userId: pref.userId,
          preferences,
          lastUpdated: pref.lastUpdated
        };
      });
    }
    
    if (hasUserFacts) {
      // Get raw data
      rawUserFacts = await mongoose.connection.db.collection('userfacts').find({}).toArray();
      console.log('[DEBUG] User facts count:', rawUserFacts.length);
      
      // Get formatted data using the model
      const userFacts = await UserFact.find({});
      formattedUserFacts = userFacts.map(fact => {
        // Convert Map to plain object
        const facts = fact.facts instanceof Map 
          ? Object.fromEntries(fact.facts)
          : fact.facts || {};
          
        return {
          _id: fact._id.toString(),
          userId: fact.userId,
          facts,
          lastUpdated: fact.lastUpdated
        };
      });
    }
    
    return NextResponse.json({
      collections: collectionNames,
      rawUserPreferences,
      rawUserFacts,
      formattedUserPreferences,
      formattedUserFacts,
      message: 'This is a debug endpoint to check MongoDB collections'
    });
  } catch (error) {
    console.error('[DEBUG] Error checking MongoDB collections:', error);
    return NextResponse.json(
      { error: 'Error checking MongoDB collections', details: String(error) },
      { status: 500 }
    );
  }
} 
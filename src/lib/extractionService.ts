import { Message } from '@/models/Message';
import { UserPreference, IUserPreference } from '@/models/UserPreference';
import { UserFact, IUserFact } from '@/models/UserFact';
import { ChatScanRecord, IChatScanRecord } from '@/models/ChatScanRecord';
import { Chat, IChat } from '@/models/Chat';
import { connectToDatabase } from './mongodb';
import openai from '@/lib/openai';
import mongoose, { Schema } from 'mongoose';

// Number of messages to process in a single batch
const BATCH_SIZE = 20;

// Define interfaces for the returned data
interface ChatDocument {
  _id: mongoose.Types.ObjectId | string;
  userId: string;
  agentId: Schema.Types.ObjectId;
  title: string;
  createdAt: Date;
}
interface MessageDocument {
  _id: mongoose.Types.ObjectId | string;
  chatId: string;
  agentId?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}
/**
 * Main entry point to scan a user's chats and extract preferences/facts
 * @param userId The ID of the user whose chats to scan
 * @param forceScan Whether to force a full rescan of all chats
 * @returns Results of the scanning process
 */
export async function scanUserChats(userId: string, forceScan: boolean = false): Promise<{
  scannedChats: number;
  newPreferences: number;
  newFacts: number;
}> {
  await connectToDatabase();
  
  // Get all chats for this user - explicitly type the result
  const chats = await Chat.find({ userId }).lean<ChatDocument[]>();
  
  if (chats.length === 0) {
    return { scannedChats: 0, newPreferences: 0, newFacts: 0 };
  }
  
  let totalNewPrefs = 0;
  let totalNewFacts = 0;
  let scannedChatCount = 0;
  
  // Process each chat
  for (const chat of chats) {
    // Now TypeScript knows that chat has _id property
    const chatId = chat._id.toString();
    const { needsScan, scanRecord } = await checkIfChatNeedsScan(chatId, userId, forceScan);
    
    if (needsScan) {
      const { newPreferences, newFacts } = await scanChat(chatId, userId, scanRecord);
      totalNewPrefs += newPreferences;
      totalNewFacts += newFacts;
      scannedChatCount++;
    }
  }
  
  return {
    scannedChats: scannedChatCount,
    newPreferences: totalNewPrefs,
    newFacts: totalNewFacts
  };
}

/**
 * Check if a chat needs to be scanned based on scan records and latest messages
 */
async function checkIfChatNeedsScan(
  chatId: string, 
  userId: string, 
  forceScan: boolean
): Promise<{ needsScan: boolean; scanRecord: Partial<IChatScanRecord> }> {
  // Get existing scan record if any
  let scanRecord = await ChatScanRecord.findOne({ chatId }).lean<IChatScanRecord>();
  
  // If no scan record exists, this chat has never been scanned
  if (!scanRecord) {
    scanRecord = {
      chatId,
      userId,
      lastScannedAt: new Date(0), // Unix epoch
      lastMessageTimestamp: new Date(0),
      scanVersion: 1,
      scannedMessageCount: 0
    };
    return { needsScan: true, scanRecord };
  }
  
  if (forceScan) {
    return { needsScan: true, scanRecord };
  }
  
  // Find the timestamp of the latest message in this chat
  const latestMessage = await Message.findOne({ chatId })
    .sort({ createdAt: -1 })
    .lean<MessageDocument>();
  
  if (!latestMessage) {
    return { needsScan: false, scanRecord };
  }
  
  // Get the count of messages in this chat
  const messageCount = await Message.countDocuments({ chatId });
  
  // Check if there are new messages since the last scan
  const lastMessageDate = new Date(latestMessage.createdAt);
  const hasNewMessages = lastMessageDate > new Date(scanRecord.lastMessageTimestamp);
  const hasMoreMessages = messageCount > scanRecord.scannedMessageCount;
  
  return { 
    needsScan: hasNewMessages || hasMoreMessages, 
    scanRecord 
  };
}

/**
 * Scan a specific chat for user preferences and facts
 */
async function scanChat(
  chatId: string, 
  userId: string, 
  scanRecord: Partial<IChatScanRecord>
): Promise<{ newPreferences: number, newFacts: number }> {
  // Get messages created after the last scan, up to BATCH_SIZE
  const lastScannedDate = new Date(scanRecord.lastMessageTimestamp ?? 0);
  
  // Find messages to scan, either new ones or all if forcing a rescan
  const messages = await Message.find({ 
    chatId,
    createdAt: { $gt: lastScannedDate }
  })
    .sort({ createdAt: 1 })
    .limit(BATCH_SIZE)
    .lean();
  
  if (messages.length === 0) {
    return { newPreferences: 0, newFacts: 0 };
  }
  
  // Format messages for analysis
  const formattedMessages = messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
  
  // Extract preferences and facts
  const { preferences, facts } = await extractPreferencesAndFacts(formattedMessages);
  
  // Save the extracted data
  let newPreferences = 0;
  let newFacts = 0;
  
  if (preferences && Object.keys(preferences).length > 0) {
    newPreferences = await savePreferences(userId, chatId, preferences);
  }
  
  if (facts && Object.keys(facts).length > 0) {
    newFacts = await saveFacts(userId, chatId, facts);
  }
  
  // Update the scan record
  await updateScanRecord(scanRecord, messages);
  
  return { newPreferences, newFacts };
}

/**
 * Extract preferences and facts from messages using LLM
 */
async function extractPreferencesAndFacts(messages: any[]): Promise<{
  preferences: Record<string, { value: string, confidence: number }>;
  facts: Record<string, { value: string, confidence: number, category: string }>;
}> {
  // Only process if there are messages
  if (!messages || messages.length === 0) {
    console.log('[EXTRACT] No messages to process');
    return { preferences: {}, facts: {} };
  }
  
  // We focus mostly on user messages
  const userMessages = messages
    .filter(msg => msg.role === "user")
    .map(msg => msg.content)
    .join("\n\n");
  
  if (!userMessages) {
    console.log('[EXTRACT] No user messages found in conversation');
    return { preferences: {}, facts: {} };
  }
  
  console.log(`[EXTRACT] Processing ${messages.length} messages for extraction`);
  console.log(`[EXTRACT] User message characters: ${userMessages.length}`);
  
  try {
    console.log('[EXTRACT] Calling OpenAI to extract preferences and facts');
    // Use OpenAI to extract preferences and facts
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: "system",
          content: `Extract user preferences and facts from the conversation fragments below.
Return the information in JSON format with the following structure:

{
  "preferences": {
    "email_preference": "likes short, concise emails with bullet points",
    "research_preference": "prefers thorough research with multiple sources cited",
    "meetings": "prefers morning meetings, no more than 30 minutes"
  },
  "facts": {
    "personal": {
      "name": "John Smith",
      "location": "San Francisco"
    },
    "professional": {
      "job_title": "Senior Product Manager",
      "company": "Tech Corp"
    },
    "technical": {
      "preferred_languages": "Python, JavaScript",
      "tools_used": "VS Code, Figma"
    }
  }
}

For preferences, use descriptive category_name keys that indicate the type of preference (like email_preference, research_preference, communication_style, etc).

For facts, organize them into categories like:
- personal (name, location, family, etc)
- professional (job, company, role, etc)
- technical (skills, languages, tools, etc)
- other (for miscellaneous facts)

Only include information explicitly stated or directly inferable with high confidence.
If no information can be extracted, return empty objects for preferences and facts.`
        },
        {
          role: "user",
          content: userMessages,
        }
      ],
      temperature: 0,
    });
    
    console.log('[EXTRACT] Received response from OpenAI');
    
    // Extract JSON from the response
    let extraction: any = {
      preferences: {},
      facts: {}
    };
    
    try {
      const content = response.choices[0].message.content || '';
      console.log('[EXTRACT] Raw OpenAI response:', content);
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        extraction = JSON.parse(jsonMatch[0]);
        console.log('[EXTRACT] Successfully parsed JSON response');
      } else {
        console.log('[EXTRACT] No JSON object found in response');
      }
    } catch (jsonError) {
      console.error("[EXTRACT] Error parsing extracted data:", jsonError);
    }
    
    console.log('[EXTRACT] Extracted preferences:', JSON.stringify(extraction.preferences || {}, null, 2));
    console.log('[EXTRACT] Extracted facts:', JSON.stringify(extraction.facts || {}, null, 2));
    
    // Adapt the extraction to our function's expected format
    const adaptedPreferences: Record<string, { value: string, confidence: number }> = {};
    const adaptedFacts: Record<string, { value: string, confidence: number, category: string }> = {};
    
    // Process preferences
    for (const [key, value] of Object.entries(extraction.preferences || {})) {
      adaptedPreferences[key] = { value: value as string, confidence: 1.0 };
    }
    
    // Process facts
    for (const category in extraction.facts || {}) {
      const categoryFacts = extraction.facts[category] || {};
      for (const [key, value] of Object.entries(categoryFacts)) {
        adaptedFacts[key] = { 
          value: value as string, 
          confidence: 1.0, 
          category 
        };
      }
    }
    
    console.log('[EXTRACT] Adapted preferences:', JSON.stringify(adaptedPreferences, null, 2));
    console.log('[EXTRACT] Adapted facts:', JSON.stringify(adaptedFacts, null, 2));
    
    return {
      preferences: adaptedPreferences,
      facts: adaptedFacts
    };
  } catch (error) {
    console.error("[EXTRACT] Error extracting data from conversation:", error);
    return { preferences: {}, facts: {} };
  }
}

/**
 * Save extracted preferences to the database
 */
async function savePreferences(
  userId: string,
  chatId: string,
  preferences: Record<string, { value: string, confidence: number }>
): Promise<number> {
  let newPreferenceCount = 0;
  
  try {
    console.log(`[SAVE_PREFERENCES] Starting to save preferences for user: ${userId}`);
    console.log(`[SAVE_PREFERENCES] Extracted preferences to save:`, JSON.stringify(preferences, null, 2));
    
    // Find existing user preferences document or create a new one
    let userPreference = await UserPreference.findOne({ userId });
    
    if (!userPreference) {
      console.log(`[SAVE_PREFERENCES] Creating new UserPreference document for user: ${userId}`);
      userPreference = new UserPreference({
        userId,
        preferences: {},
      });
    } else {
      console.log(`[SAVE_PREFERENCES] Found existing UserPreference document for user: ${userId}`);
      console.log(`[SAVE_PREFERENCES] Current preferences:`, JSON.stringify(userPreference.preferences?.toJSON() || {}, null, 2));
    }
    
    // Update or add each new preference
    for (const [key, data] of Object.entries(preferences)) {
      // Since we're now storing as an object, we can just update each field
      if (!userPreference.preferences) {
        userPreference.preferences = new Map();
      }
      
      console.log(`[SAVE_PREFERENCES] Setting preference: ${key} = ${data.value}`);
      userPreference.preferences.set(key, data.value);
      newPreferenceCount++;
    }
    
    // Save the updates
    userPreference.lastUpdated = new Date();
    const saveResult = await userPreference.save();
    
    // Get the saved document to verify the data was saved correctly
    const savedPreference = await UserPreference.findById(saveResult._id);
    const preferencesObj = savedPreference?.preferences instanceof Map 
      ? Object.fromEntries(savedPreference.preferences)
      : savedPreference?.preferences || {};
    
    console.log(`[SAVE_PREFERENCES] Successfully saved preferences. Document ID: ${saveResult._id}`);
    console.log(`[SAVE_PREFERENCES] Updated preferences:`, JSON.stringify(preferencesObj, null, 2));
    
    return newPreferenceCount;
  } catch (error) {
    console.error(`[SAVE_PREFERENCES] Error saving preferences:`, error);
    return 0;
  }
}

/**
 * Save extracted facts to the database
 */
async function saveFacts(
  userId: string,
  chatId: string,
  facts: Record<string, { value: string, confidence: number, category: string }>
): Promise<number> {
  let newFactCount = 0;
  
  try {
    console.log(`[SAVE_FACTS] Starting to save facts for user: ${userId}`);
    console.log(`[SAVE_FACTS] Extracted facts to save:`, JSON.stringify(facts, null, 2));
    
    // Find existing user facts document or create a new one
    let userFact = await UserFact.findOne({ userId });
    
    if (!userFact) {
      console.log(`[SAVE_FACTS] Creating new UserFact document for user: ${userId}`);
      userFact = new UserFact({
        userId,
        facts: {},
      });
    } else {
      console.log(`[SAVE_FACTS] Found existing UserFact document for user: ${userId}`);
      console.log(`[SAVE_FACTS] Current facts:`, JSON.stringify(userFact.facts?.toJSON() || {}, null, 2));
    }
    
    // Update or add each new fact
    for (const [key, data] of Object.entries(facts)) {
      // For facts, format the key to include category if available
      // e.g., "email_preference" or "meeting_preference" 
      const formattedKey = data.category ? `${data.category}_${key}` : key;
      
      if (!userFact.facts) {
        userFact.facts = new Map();
      }
      
      console.log(`[SAVE_FACTS] Setting fact: ${formattedKey} = ${data.value} (category: ${data.category || 'none'})`);
      userFact.facts.set(formattedKey, data.value);
      newFactCount++;
    }
    
    // Save the updates
    userFact.lastUpdated = new Date();
    const saveResult = await userFact.save();
    
    // Get the saved document to verify the data was saved correctly
    const savedFact = await UserFact.findById(saveResult._id);
    const factsObj = savedFact?.facts instanceof Map 
      ? Object.fromEntries(savedFact.facts)
      : savedFact?.facts || {};
    
    console.log(`[SAVE_FACTS] Successfully saved facts. Document ID: ${saveResult._id}`);
    console.log(`[SAVE_FACTS] Updated facts:`, JSON.stringify(factsObj, null, 2));
    
    return newFactCount;
  } catch (error) {
    console.error(`[SAVE_FACTS] Error saving facts:`, error);
    return 0;
  }
}

/**
 * Update scan record after processing a batch of messages
 */
async function updateScanRecord(scanRecord: Partial<IChatScanRecord>, messages: any[]): Promise<void> {
  if (messages.length === 0) return;
  
  // Get the timestamp of the latest message processed
  const latestMessage = messages[messages.length - 1];
  const latestTimestamp = new Date(latestMessage.createdAt);
  
  // Update or create scan record
  if (scanRecord._id) {
    await ChatScanRecord.updateOne(
      { _id: scanRecord._id },
      {
        $set: {
          lastScannedAt: new Date(),
          lastMessageTimestamp: latestTimestamp,
          scannedMessageCount: (scanRecord.scannedMessageCount ?? 0) + messages.length,
          scanVersion: (scanRecord.scanVersion ?? 1) + 1
        }
      }
    );
  } else {
    await ChatScanRecord.create({
      chatId: scanRecord.chatId,
      userId: scanRecord.userId,
      lastScannedAt: new Date(),
      lastMessageTimestamp: latestTimestamp,
      scannedMessageCount: messages.length,
      scanVersion: 1
    });
  }
}

/**
 * Retrieve user preferences and facts for use in agent context
 */
export async function getUserContext(userId: string): Promise<{
  preferences: Record<string, string>;
  facts: Record<string, string>;
}> {
  await connectToDatabase();
  
  // Get user preferences with proper typing
  const userPreferences = await UserPreference.findOne({ userId }).lean<IUserPreference>();
  
  // Get user facts with proper typing
  const userFacts = await UserFact.findOne({ userId }).lean<IUserFact>();
  
  // Process preferences - handle Map if needed
  let preferences: Record<string, string> = {};
  if (userPreferences?.preferences) {
    if (userPreferences.preferences instanceof Map) {
      preferences = Object.fromEntries(userPreferences.preferences);
    } else {
      // Handle case where it might already be an object
      preferences = userPreferences.preferences as Record<string, string>;
    }
  }
  
  // Process facts - handle Map if needed
  let facts: Record<string, string> = {};
  if (userFacts?.facts) {
    if (userFacts.facts instanceof Map) {
      facts = Object.fromEntries(userFacts.facts);
    } else {
      // Handle case where it might already be an object
      facts = userFacts.facts as Record<string, string>;
    }
  }
  
  // Return the formatted data
  return { preferences, facts };
}

/**
 * Format user context for inclusion in agent prompts
 */
export function formatUserContextForPrompt(
  preferences: Record<string, string>,
  facts: Record<string, string>
): string {
  let contextString = '';
  
  // Format preferences by category
  if (Object.keys(preferences).length > 0) {
    contextString += '## User Preferences\n';
    
    // Group preferences by category prefix
    const categorizedPrefs: Record<string, string[]> = {};
    
    for (const [key, value] of Object.entries(preferences)) {
      const parts = key.split('_');
      if (parts.length > 1) {
        const category = parts[0];
        if (!categorizedPrefs[category]) {
          categorizedPrefs[category] = [];
        }
        // Format the key without the category prefix
        const displayKey = parts.slice(1).join(' ');
        categorizedPrefs[category].push(`- ${displayKey}: ${value}`);
      } else {
        // Handle uncategorized preferences
        if (!categorizedPrefs['general']) {
          categorizedPrefs['general'] = [];
        }
        categorizedPrefs['general'].push(`- ${key.replace(/_/g, ' ')}: ${value}`);
      }
    }
    
    // Output each category of preferences
    for (const [category, items] of Object.entries(categorizedPrefs)) {
      contextString += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
      contextString += items.join('\n') + '\n\n';
    }
  }
  
  // Format facts by category
  if (Object.keys(facts).length > 0) {
    contextString += '## User Facts\n';
    
    // Group facts by category prefix
    const categorizedFacts: Record<string, string[]> = {};
    
    for (const [key, value] of Object.entries(facts)) {
      // Facts might be stored with category prefix (e.g., personal_name)
      const parts = key.split('_');
      if (parts.length > 1) {
        const category = parts[0];
        if (!categorizedFacts[category]) {
          categorizedFacts[category] = [];
        }
        // Format the key without the category prefix
        const displayKey = parts.slice(1).join(' ');
        categorizedFacts[category].push(`- ${displayKey}: ${value}`);
      } else {
        // Handle uncategorized facts
        if (!categorizedFacts['general']) {
          categorizedFacts['general'] = [];
        }
        categorizedFacts['general'].push(`- ${key.replace(/_/g, ' ')}: ${value}`);
      }
    }
    
    // Output each category of facts
    for (const [category, items] of Object.entries(categorizedFacts)) {
      contextString += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
      contextString += items.join('\n') + '\n\n';
    }
  }
  
  return contextString || 'No specific user context available.';
}
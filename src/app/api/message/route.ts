import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Message } from '@/models/Message';
import { Chat } from '@/models/Chat';
import openai from '@/lib/openai';
import { User } from '@/models/User';
import { loadComposioTools, executeComposioTool, COMPOSIO_ACTIONS, findToolsByUseCase } from '@/lib/composio';
import { runComposioAgentWithTools } from '@/lib/langchain-composio';
import { executingTheTools } from '@/lib/langchain-composio-temp';
import { Agent } from '@/models/Agent';
import { ShortTermMemory, createShortTermMemory } from '@/lib/shortTermMemory';
import { BufferMemory } from 'langchain/memory';

// Conditionally import chat-memory based on its availability
let createChatMemory: any;
// try {
//   const chatMemoryModule = require('@/lib/memory/chat-memory');
//   createChatMemory = chatMemoryModule.createChatMemory;
// } catch (error) {
//   console.log('Chat memory module not available:', error);
//   createChatMemory = null;
// }

/**
 * Generate a concise three-word title from the first message
 * @param message User's first message
 * @returns A three-word summary as the chat title
 */
async function generateChatTitle(message: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Summarize the following message in exactly three words to create a concise chat title. Use only three words separated by spaces.'
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 20
    });

    const title = response.choices[0].message.content?.trim() || 'New Chat';
    return title;
  } catch (error) {
    console.error('Error generating chat title:', error);
    return 'New Chat';
  }
}

/**
 * Analyze prompt to detect which apps might be needed
 * @param message User's message
 * @param supportedApps List of supported app names
 * @param conversationContext Optional previous conversation context
 * @returns Array of app names that might be relevant
 */
async function findappsfromprompt(message: string, supportedApps: string[], conversationContext?: string): Promise<string> {
  // Include conversation context in the prompt if available
  const contextPrompt = conversationContext ? 
    `Previous conversation context:\n${conversationContext}\n\nBased on the ENTIRE conversation context and the user's latest message:` : 
    '';

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a tool analyzer that determines which tools a user might need based on their request.
Available tools are: ${supportedApps.join(', ')}.
${contextPrompt}

Return ONLY a valid JSON array of strings containing the tool names needed. 
Example responses:
- If GitHub is needed: ["github"]
- If Gmail and Google Drive are needed: ["gmail", "googledrive"]
- If no tools are needed: []

Do not include ANY explanation, ONLY return the JSON array.
Only include tools from the available list.`
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.3,
      max_tokens: 50
    });

    const relevantApps = response.choices[0].message.content?.trim() || '[]';
    console.log("Apps detected for this request:", relevantApps);
    return relevantApps;
  } catch (error) {
    console.error('Error finding apps from prompt:', error);
    return '[]';
  }
}


export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get user prompt and agentId from request    
    const { content, chatId, agentId } = await request.json();
    await connectToDatabase();

    // Get user ID from session or find by email if not available
    let userId = session.user._id;
    
    // Only use the fallback mechanism if _id is missing
    if (!userId && session.user.email) {
      console.log('Message API - _id missing, using email fallback');
      const userFromDB = await User.findOne({ email: session.user.email });
      
      if (userFromDB) {
        userId = userFromDB._id.toString();
      } else {
        userId = session.user.email; // Last resort fallback
      }
    } else {
      console.log('Message API - Using session user._id:', userId);
    }

    let currentChatId = chatId;
    let currentAgentId = agentId;

    // If no chatId provided, create a new chat
    if (!currentChatId) {
      // Require agentId for new chats
      if (!currentAgentId) {
        return NextResponse.json({ error: 'Agent ID is required to create a new chat' }, { status: 400 });
      }
      
      // Generate title using AI
      const title = await generateChatTitle(content);
      
      const newChat = await Chat.create({
        userId: userId,
        agentId: currentAgentId,
        title: title,
      });
      currentChatId = newChat._id.toString();
    } else if (!currentAgentId) {
      // If chatId is provided but agentId isn't, fetch the agent from the chat
      const chat = await Chat.findById(currentChatId);
      if (chat && chat.agentId) {
        currentAgentId = chat.agentId.toString();
      }
    }

    // Fetch agent data if we have an agent ID
    let agentData = null;
    if (currentAgentId) {
      agentData = await Agent.findById(currentAgentId);
    }

    // Initialize short-term memory for this chat
    const shortTermMemory = createShortTermMemory(currentChatId, currentAgentId);
    
    // Save user message to short-term memory
    const userMessage = await shortTermMemory.addMessage('user', content);

    // Get previous messages for context from short-term memory
    const contextMessages = await shortTermMemory.getFormattedContextMessages();
    
    // Initialize buffer memory if createChatMemory is available
    let bufferMemory: BufferMemory | null = null;
    if (createChatMemory && currentAgentId && currentChatId) {
      try {
        bufferMemory = createChatMemory({
          agentId: currentAgentId,
          chatId: currentChatId,
          returnMessages: true,
        });
        console.log('Buffer memory initialized from DynamoDB for chat history');
      } catch (memoryError) {
        console.error('Error initializing buffer memory:', memoryError);
        // Continue without buffer memory
      }
    }

    try {
      // Define the apps we want to search across (apps user has connected)
      const supportedApps = ["github", "gmail", "whatsapp", "googlecalendar", "googledrive", "googledocs","yousearch","linkedin","slack","jira","googlesheets"];
      let assistantMessageText = '';
      
      // Get conversation context as a string
      const conversationContext = await shortTermMemory.getContextString();
      
      // 2. Find semantic tools needed based on the prompt with conversation context
      console.log('Finding semantic tools for prompt with context...', conversationContext);
      const semanticToolsResponse = await findappsfromprompt(content, supportedApps, conversationContext);
      let parsedSemanticTools: string[] = [];
      
      // Try to parse the response to get semantic tools
      try {
        if (typeof semanticToolsResponse === "string") {
          // Strip any non-JSON characters that might be in the response
          const cleanedResponse = semanticToolsResponse.trim().replace(/^[^[\]]*\[/, '[').replace(/\][^[\]]*$/, ']');
          
          try {
            // Try parsing the string as JSON
            const parsed = JSON.parse(cleanedResponse);
            
            // Ensure the result is an array of strings
            if (Array.isArray(parsed)) {
              parsedSemanticTools = parsed.filter(item => typeof item === 'string');
              console.log('Parsed semantic tools:', parsedSemanticTools);
            } else {
              console.log('Parsed result is not an array, defaulting to empty array');
            }
          } catch (parseError) {
            console.error("Error parsing semanticTools string:", parseError);
            // Try to extract app names if JSON parsing fails
            const appMatches = cleanedResponse.match(/"([^"]+)"|'([^']+)'|[a-zA-Z0-9]+/g);
            if (appMatches) {
              parsedSemanticTools = appMatches
                .map(match => match.replace(/['"]/g, ''))
                .filter(app => supportedApps.includes(app));
              console.log('Extracted semantic tools using regex:', parsedSemanticTools);
            }
          }
        } else if (Array.isArray(semanticToolsResponse)) {
          // If already an array, filter for strings
          parsedSemanticTools = (semanticToolsResponse as any[]).filter(item => typeof item === 'string');
        }
      } catch (error) {
        console.error('Error processing semantic tools:', error);
        // Continue with empty array
      }
      
      // Validate that all tools in parsedSemanticTools are in supportedApps
      parsedSemanticTools = parsedSemanticTools.filter(tool => 
        typeof tool === 'string' && supportedApps.includes(tool)
      );
      
      console.log('Final semantic tools to be used:', parsedSemanticTools);
      
      // Create agent config from agentData if available
      const agentConfig = agentData ? {
        name: agentData.name,
        description: agentData.description,
        context: agentData.context,
        instructions: agentData.instructions + 
          (conversationContext ? "\n\nPrevious conversation:\n" + conversationContext : ""),
        temperature: 0.2,
      } : undefined;
      
      // Always use LangChain agent, regardless of whether tools are needed or not
      console.log('Executing with LangChain agent...');
      
      // Pass agent configuration, context messages, and buffer memory to executingTheTools
      const langchainResponse = await executingTheTools(content, parsedSemanticTools, agentConfig, {
        contextMessages: contextMessages,
        chatMemory: bufferMemory
      });
      
      assistantMessageText = langchainResponse.output;
      const toolExecutionData = langchainResponse.toolExecutionData || [];

      // Save assistant message to short-term memory
      const dbAssistantMessage = await shortTermMemory.addMessage('assistant', assistantMessageText);

      return NextResponse.json({
        userMessage,
        assistantMessage: dbAssistantMessage,
        chatId: currentChatId,
        tasks: toolExecutionData
      });
    } catch (aiError) {
      console.error('AI processing error:', aiError);
      
      // Save a fallback message to short-term memory
      const fallbackMessage = 'I apologize, but I encountered an error processing your request. Please try again.';
      
      const assistantMessage = await shortTermMemory.addMessage('assistant', fallbackMessage);

      return NextResponse.json({
        userMessage,
        assistantMessage,
        chatId: currentChatId,
        aiError: true,
      });
    }
  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json(
      { error: 'Error processing message' },
      { status: 500 }
    );
  }
} 
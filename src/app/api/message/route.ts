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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get user prompt
    const { content, chatId } = await request.json();
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

    // If no chatId provided, create a new chat
    if (!currentChatId) {
      const newChat = await Chat.create({
        userId: userId,
        title: content.substring(0, 30) + '...',
      });
      currentChatId = newChat._id.toString();
    }

    // Save user message
    const userMessage = await Message.create({
      chatId: currentChatId,
      role: 'user',
      content,
    });

    // Get previous messages for context
    const previousMessages = await Message.find({ chatId: currentChatId })
      .sort({ createdAt: 1 })
      .limit(10);

    // Format messages for OpenAI
    const messages = previousMessages.map(msg => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
    }));

    try {
      // Define the apps we want to search across (apps user has connected)
      const supportedApps = ["gmail", "github", "notion", "slack", "jira"];
      let assistantMessageText = '';
      let toolResult = null;
      
      // 2. Find semantic tools needed based on the prompt
      console.log('Finding semantic tools for prompt...');
      const semanticTools = await findToolsByUseCase(content, supportedApps, true);
      
      if (semanticTools && semanticTools.length > 0) {
        console.log(`Found ${semanticTools.length} relevant tools for prompt`);
        
        // 3. Pass prompt and semantic tools to LangChain for execution
        console.log('Executing with LangChain...');
        
        const langchainResponse = await executingTheTools(content, semanticTools);
        // const langchainResponse = await runComposioAgentWithTools(content, semanticTools);
        
        assistantMessageText = langchainResponse.output;
        // toolResult = langchainResponse.steps.length > 0 ? langchainResponse.steps : null;
      } else {
        // Fallback to direct OpenAI if no semantic tools found
        console.log('No semantic tools found, using direct OpenAI approach...');
        const openAIResponse = await processWithOpenAI(content, messages);
        assistantMessageText = openAIResponse.content;
        toolResult = openAIResponse.toolResult;
      }

      // Save assistant message
      const dbAssistantMessage = await Message.create({
        chatId: currentChatId,
        role: 'assistant',
        content: assistantMessageText,
        toolResult: toolResult ? JSON.stringify(toolResult) : undefined,
      });

      return NextResponse.json({
        userMessage,
        assistantMessage: dbAssistantMessage,
        chatId: currentChatId,
      });
    } catch (aiError) {
      console.error('AI processing error:', aiError);
      
      // Save a fallback message
      const fallbackMessage = 'I apologize, but I encountered an error processing your request. Please try again.';
      
      const assistantMessage = await Message.create({
        chatId: currentChatId,
        role: 'assistant',
        content: fallbackMessage,
      });

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

/**
 * Process the request using direct OpenAI API calls
 * @param content User's message
 * @param messages Previous conversation messages
 * @returns Processed response
 */
async function processWithOpenAI(content: string, messages: any[]) {
  let functionToActionMap: Record<string, string> = {};
  let tools = [];
  
  try {
    // Define the apps we want to search across
    const supportedApps = ["gmail", "github", "notion", "slack", "jira"];
    
    // Use semantic search to find relevant tools
    const semanticTools = await findToolsByUseCase(
      content,
      supportedApps,
      true
    );
    
    if (semanticTools && semanticTools.length > 0) {
      console.log(`Found ${semanticTools.length} relevant tools via semantic search`);
      tools = semanticTools;
      
      // Map function names to action names
      semanticTools.forEach(tool => {
        if (tool.function && tool.function.name) {
          const functionName = tool.function.name;
          // Using type assertion since Composio tools have additional metadata
          const actionName = (tool as any).metadata?.actionName || functionName;
          functionToActionMap[functionName] = actionName;
        }
      });
    } else {
      // Fallback to predefined tools
      console.log('No relevant tools found via semantic search, using default set');
      tools = await loadComposioTools([
        COMPOSIO_ACTIONS.GMAIL_SEND_AN_EMAIL,
        COMPOSIO_ACTIONS.GMAIL_GET_CONTACTS,
        COMPOSIO_ACTIONS.GITHUB_STAR_A_REPOSITORY_FOR_THE_AUTHENTICATED_USER
      ]);
      
      // Create mappings for predefined tools
      tools.forEach(tool => {
        if (tool.function && tool.function.name) {
          functionToActionMap[tool.function.name] = tool.function.name;
        }
      });
    }
  } catch (toolsError) {
    console.error('Error finding tools:', toolsError);
    // Fallback to predefined tools
    tools = await loadComposioTools([
      COMPOSIO_ACTIONS.GMAIL_SEND_AN_EMAIL,
      COMPOSIO_ACTIONS.GMAIL_GET_CONTACTS,
      COMPOSIO_ACTIONS.GITHUB_STAR_A_REPOSITORY_FOR_THE_AUTHENTICATED_USER
    ]);
    
    tools.forEach(tool => {
      if (tool.function && tool.function.name) {
        functionToActionMap[tool.function.name] = tool.function.name;
      }
    });
  }
  
  // Generate response from OpenAI with tool calling
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages,
    temperature: 0.7,
    max_tokens: 500,
    tools,
    tool_choice: 'auto',
  });

  const assistantMessage = response.choices[0].message;
  let assistantMessageText = assistantMessage.content || '';
  let toolResult = null;

  // Check if the model wants to call a function
  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    const toolCall = assistantMessage.tool_calls[0];
    const functionName = toolCall.function.name;
    
    // Get the correct Composio action name from our mapping
    const actionName = functionToActionMap[functionName] || functionName;
    
    try {
      // Parse arguments
      const args = JSON.parse(toolCall.function.arguments);
      
      // Execute the Composio tool with the correct action name
      toolResult = await executeComposioTool(actionName, args);
      
      // Format messages for the follow-up request
      const toolCallMessages = [
        ...messages,
        {
          role: "assistant" as const,
          content: null,
          tool_calls: [toolCall]
        },
        {
          role: "tool" as const,
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        }
      ];
      
      // Generate a follow-up response
      const followUpResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: toolCallMessages,
        temperature: 0.7,
        max_tokens: 500,
      });
      
      assistantMessageText = followUpResponse.choices[0].message.content || 'I processed your request, but I couldn\'t generate a response.';
    } catch (toolError) {
      console.error('Error executing tool:', toolError);
      const errorMessage = toolError instanceof Error ? toolError.message : 'Unknown error';
      assistantMessageText = `I attempted to use ${functionName}, but encountered an error: ${errorMessage}`;
    }
  }
  
  return {
    content: assistantMessageText,
    toolResult
  };
} 
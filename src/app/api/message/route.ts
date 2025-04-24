import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Message } from '@/models/Message';
import { Chat } from '@/models/Chat';
import openai from '@/lib/openai';
import { User } from '@/models/User';
import { loadComposioTools, executeComposioTool, COMPOSIO_ACTIONS, findToolsByUseCase } from '@/lib/composio';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      // First, analyze the user query to find relevant tools dynamically
      console.log('Analyzing user query for relevant tools...');
      let tools = [];
      
      // Store a mapping between function names and original action names
      let functionToActionMap: Record<string, string> = {};
      
      try {
        // Define the apps we want to search across
        const supportedApps = ["gmail", "github", "notion", "slack", "jira"];
        
        // Use the experimental semantic search to find relevant tools based on the user's query
        const semanticTools = await findToolsByUseCase(
          content,
          supportedApps, // Always provide the apps parameter
          true // Enable advanced mode for complex queries
        );
        console.log('semantic tools = ', semanticTools);
        
        if (semanticTools && semanticTools.length > 0) {
          console.log(`Found ${semanticTools.length} relevant tools via semantic search`);
          tools = semanticTools;
          
          // Map function names to action names
          semanticTools.forEach(tool => {
            if (tool.function && tool.function.name) {
              // Store the mapping between the function name OpenAI will use and the actual action name
              // This is important because OpenAI will use the name from the tool schema, but we need
              // to know the original Composio action name when executing
              const functionName = tool.function.name;
              const actionName = tool.metadata?.actionName || functionName;
              functionToActionMap[functionName] = actionName;
              console.log(`Mapped function ${functionName} to action ${actionName}`);
            }
          });
        } else {
          // Fallback to predefined tools if semantic search doesn't find anything
          console.log('No relevant tools found via semantic search, using default set');
          tools = await loadComposioTools([
            COMPOSIO_ACTIONS.GMAIL_SEND_AN_EMAIL,
            COMPOSIO_ACTIONS.GMAIL_GET_CONTACTS,
            COMPOSIO_ACTIONS.GITHUB_STAR_A_REPOSITORY_FOR_THE_AUTHENTICATED_USER
          ]);
          
          // Create mappings for our predefined tools
          tools.forEach(tool => {
            if (tool.function && tool.function.name) {
              functionToActionMap[tool.function.name] = tool.function.name;
            }
          });
        }
      } catch (toolsError) {
        console.error('Error finding tools via semantic search:', toolsError);
        // Fallback to predefined tools in case of error
        tools = await loadComposioTools([
          COMPOSIO_ACTIONS.GMAIL_SEND_AN_EMAIL,
          COMPOSIO_ACTIONS.GMAIL_GET_CONTACTS,
          COMPOSIO_ACTIONS.GITHUB_STAR_A_REPOSITORY_FOR_THE_AUTHENTICATED_USER
        ]);
        
        // Create mappings for our predefined tools
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
        console.log(`Tool call detected: ${functionName}`);
        
        // Get the correct Composio action name from our mapping
        const actionName = functionToActionMap[functionName] || functionName;
        console.log(`Using Composio action: ${actionName}`);
        
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
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      
      // Save a fallback message
      const fallbackMessage = 'I apologize, but I encountered an error processing your request. Please make sure your OpenAI API key is set up correctly.';
      
      const assistantMessage = await Message.create({
        chatId: currentChatId,
        role: 'assistant',
        content: fallbackMessage,
      });

      return NextResponse.json({
        userMessage,
        assistantMessage,
        chatId: currentChatId,
        openaiError: true,
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
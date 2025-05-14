import { ChatOpenAI } from "@langchain/openai";
import { createOpenAIFunctionsAgent, AgentExecutor } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { LangchainToolSet } from "composio-core";
import { pull } from "langchain/hub";
import { findToolsByUseCase } from "./composio";
import { ToolTrackingCallbackHandler } from "./customCallbackLangchain";
import { getServerSession } from "next-auth";
import { ConsoleCallbackHandler } from "@langchain/core/tracers/console";
import { BufferMemory } from "langchain/memory";
import { AIMessage, HumanMessage } from "@langchain/core/messages";

export async function executingTheTools(
  input: string,
  semanticTools: string[],
  agentConfig?: {
    name?: string;
    description?: string;
    context?: string;
    instructions?: string;
    temperature?: number;
  },
  options?: { 
    callbacks?: any[],
    contextMessages?: Array<{ role: string, content: string }>,
    chatMemory?: BufferMemory | null
  }
) {
  //Create our custom callback handler
  const toolTracker = new ToolTrackingCallbackHandler();
  const callbacks = options?.callbacks || [];
  callbacks.push(toolTracker);
//create a new options object with the callbacks
  const optionsWithCallbacks = {
    ...(options || {}),
    callbacks: callbacks
  };

  console.log("Semantic tools pre-filtered:", semanticTools);
  
  // Default agent configuration
  const defaultAgentConfig = {
    name: "AssistantAgent",
    description: "a helpful AI assistant that can use various tools to assist users.",
    context: "You're here to help the user complete tasks using the provided tools.",
    instructions: "Use the appropriate tools to help users. Be concise and helpful.",
    temperature: 0.2,
  };

  // Merge default config with provided config
  const finalAgentConfig = {
    ...defaultAgentConfig,
    ...agentConfig,
  };

  // Get the buffer memory if provided in options
  const bufferMemory = options?.chatMemory || undefined;
  if (bufferMemory) {
    console.log('Using provided buffer memory for chat history');
  }

  const session = await getServerSession();
  const llm = new ChatOpenAI({
    temperature: finalAgentConfig.temperature,
  });
  
  const toolset = new LangchainToolSet({
    entityId: session?.user.email ?? undefined,
  });

  for (const app of semanticTools){
    try {
      const connection = await toolset.connectedAccounts.initiate({ appName: app });
  
    } catch (err) {
      console.error(`Error connecting to ${app}:`, err);
    }
  }
  
  
  
  // 2. Fetch the actual tools for the selected apps
  let allTools: any[] = [];
  try {
    // Only try to get tools if we have valid semanticTools
    if (semanticTools && Array.isArray(semanticTools) && semanticTools.length > 0) {
      allTools = await toolset.getTools({ apps: semanticTools });
    } else {
      console.log('No semantic tools provided, skipping tool retrieval');
    }
  } catch (error) {
    console.error('Error getting tools:', error);
    // Continue with empty tools array
  }
  
  // Build previous messages context string
  let previousMessagesContext = "";
  if (options?.contextMessages && options.contextMessages.length > 0) {
    previousMessagesContext = "\n\n# Previous Conversation Context\n";
    options.contextMessages.forEach(msg => {
      const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System';
      previousMessagesContext += `${role}: ${msg.content}\n`;
    });
  }
  
  // Build a custom system message with agent info, context, and instructions
  const systemMessage = `
# Agent Profile
You are ${finalAgentConfig.name}, ${finalAgentConfig.description}

# Available Tools
${semanticTools.length > 0 ? 
  `You have access to the following tools/apps:
${semanticTools.map(tool => `- ${tool}`).join('\n')}` : 
  `You don't have any tools available for this conversation. Please respond using only your knowledge.`}

# Context
${finalAgentConfig.context}

# Instructions
${finalAgentConfig.instructions}
${previousMessagesContext}

# Response Guidelines
1. Always identify yourself as ${finalAgentConfig.name}
2. ${semanticTools.length > 0 ? 'Use available tools when appropriate to fulfill user requests' : 'Provide helpful responses based on your knowledge'}
3. Think step by step when solving complex problems
4. ${semanticTools.length > 0 ? 'If you need information from a connected service, use the appropriate tool' : 'If you need information you don\'t have, explain what you would need to help further'}
5. Be helpful, concise, and professional in your responses
`;

  // Create the prompt template with system message, user input, and agent scratchpad
  const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", systemMessage],
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  // Create a direct prompt template for when we don't have tools
  const directPromptTemplate = ChatPromptTemplate.fromMessages([
    ["system", systemMessage],
    ["human", "{input}"]
  ]);

  // Different execution paths based on whether we have tools or not
  let response;
  
  // If we have tools, use the function calling agent
  if (allTools && allTools.length > 0) {
    // Create the agent with our custom prompt and tools
    const agent = await createOpenAIFunctionsAgent({
      llm,
      tools: allTools,
      prompt: promptTemplate,
    });
    
    // Create the agent executor with memory if available
    const executorConfig: any = { 
      agent, 
      tools: allTools, 
      verbose: false,
      callbacks: optionsWithCallbacks.callbacks
    };

    // Add memory to the executor if available
    if (bufferMemory) {
      executorConfig.memory = bufferMemory;
    }

    try {
      const agentExecutor = new AgentExecutor(executorConfig);

      // Invoke the agent on the user's input with the previous conversation
      const agentInput: Record<string, any> = { input };
      
      // Add memory variables to input if needed
      if (bufferMemory) {
        // This will be populated by the memory system
        agentInput.chat_history = '';
      }

      // Use a timeout to prevent agent from running too long
      const timeoutPromise = new Promise<any>((_, reject) => {
        setTimeout(() => reject(new Error('Agent execution timed out')), 60000); // 60-second timeout
      });

      // Execute the agent with a timeout
      response = await Promise.race([
        agentExecutor.invoke(agentInput),
        timeoutPromise
      ]);
      const toolExecutionData = toolTracker.getToolExecutionData();
      console.log("Tool execution Summary:", JSON.stringify(toolExecutionData, null, 2));

      // console.log("Agent response:", response);
      response = {
        ...response,
        toolExecutionData
      };
    } catch (error) {
      console.error("Error during agent execution:", error);
      // Fall back to direct LLM call when agent execution fails
      console.log("Falling back to direct LLM call");
      const result = await llm.invoke([
        ["system", systemMessage],
        ["human", input]
      ]);
      response = { 
        output: result.content,
        toolExecutionData: []
      };
    }
  } else {
    // When no tools are available, use direct LLM call without function calling
    console.log("No tools available, using direct LLM call");
    try {
      // Direct call to the language model
      const directInput = { input };
      if (bufferMemory) {
        // Use proper message class for chat history
        bufferMemory.chatHistory.addMessage(new HumanMessage(input));
      }
      
      const result = await llm.invoke([
        ["system", systemMessage],
        ["human", input]
      ]);
      
      if (bufferMemory) {
        // Use proper message class for chat history
        bufferMemory.chatHistory.addMessage(new AIMessage(result.content.toString()));
      }
      
      response = { 
        output: result.content,
        toolExecutionData: []
      };
      console.log("Direct LLM response:", response);
    } catch (error) {
      console.error("Error during direct LLM call:", error);
      // Return a fallback response for direct call errors
      response = {
        output: "I encountered an error while processing your request. Please try again or rephrase your question.",
        toolExecutionData: []
      };
    }
  }

  return response;
}

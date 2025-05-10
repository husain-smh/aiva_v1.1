import { ChatOpenAI } from "@langchain/openai";
import { createOpenAIFunctionsAgent, AgentExecutor } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { LangchainToolSet } from "composio-core";
import { getServerSession } from "next-auth";
import { ConsoleCallbackHandler } from "@langchain/core/tracers/console";

export async function createCustomAgentExecutor({
  agentName,
  agentDescription,
  context,
  instructions,
  semanticTools,
  temperature = 0.2,
  verbose = false,
  callbacks = [new ConsoleCallbackHandler()]
}: {
  agentName: string;
  agentDescription: string;
  context: string;
  instructions: string;
  semanticTools: string[];
  temperature?: number;
  verbose?: boolean;
  callbacks?: any[];
}) {
  // Get user session
  const session = await getServerSession();
  
  // Initialize the LLM
  const llm = new ChatOpenAI({
    temperature,
    modelName: "gpt-3.5-turbo", // Or your preferred model
  });
  
  // Initialize toolset
  const toolset = new LangchainToolSet({
    entityId: session?.user.email ?? undefined,
  });
  
  // Connect to required apps
  for (const app of semanticTools) {
    try {
      const connection = await toolset.connectedAccounts.initiate({ appName: app });
    //   if (connection?.needsToConnect) {
    //     console.log(`User needs to connect ${app} at: ${connection.redirectUrl}`);
    //     // You might want to handle this case, perhaps by returning the URL
    //   }
    } catch (err) {
      console.error(`Error connecting to ${app}:`, err);
    }
  }
  
  // Get tools for the selected apps
  const allTools = await toolset.getTools({ apps: semanticTools });
  
  // Build a custom system message with agent info, context, and instructions
  const systemMessage = `
# Agent Profile
You are ${agentName}, ${agentDescription}

# Available Tools
You have access to the following tools/apps:
${semanticTools.map(tool => `- ${tool}`).join('\n')}

# Context
${context}

# Instructions
${instructions}

# Response Guidelines
1. Always identify yourself as ${agentName}
2. Use available tools when appropriate to fulfill user requests
3. Think step by step when solving complex problems
4. If you need information from a connected service, use the appropriate tool
5. Be helpful, concise, and professional in your responses
`;

  // Create the prompt template with system message, user input, and agent scratchpad
  const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", systemMessage],
    // Optional: Add memory placeholder if you want to incorporate memory
    // new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  // Create the agent
  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools: allTools,
    prompt: promptTemplate,
  });

  // Create the executor
  const agentExecutor = new AgentExecutor({
    agent,
    tools: allTools,
    verbose,
    callbacks,
  });

  return agentExecutor;
}

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
  options?: { callbacks?: any[] }
) {
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

  // Create custom agent executor
  const agentExecutor = await createCustomAgentExecutor({
    agentName: finalAgentConfig.name,
    agentDescription: finalAgentConfig.description,
    context: finalAgentConfig.context,
    instructions: finalAgentConfig.instructions,
    semanticTools,
    temperature: finalAgentConfig.temperature,
    callbacks: options?.callbacks || [new ConsoleCallbackHandler()],
  });

  // Execute the agent
  const response = await agentExecutor.invoke({ input });
  console.log("Agent response:", response);

  return response;
}

// Example usage:
/*
const result = await executingTheTools(
  "Schedule a meeting with John tomorrow at 2pm", 
  ["google-calendar", "gmail"],
  {
    name: "SchedulerBot",
    description: "an AI assistant specialized in managing calendars and communications",
    context: "The user relies on you to coordinate their schedule efficiently.",
    instructions: "When scheduling meetings, always verify availability first. Send calendar invites with clear descriptions.",
  }
);
*/
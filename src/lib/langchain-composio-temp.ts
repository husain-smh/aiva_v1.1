import { ChatOpenAI } from "@langchain/openai";
import { createOpenAIFunctionsAgent, AgentExecutor } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { LangchainToolSet } from "composio-core";
import { pull } from "langchain/hub";
import { findToolsByUseCase } from "./composio";
import { getServerSession } from "next-auth";
import { ConsoleCallbackHandler } from "@langchain/core/tracers/console";



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
   // 1. Detect apps needed
  //  const serviceType = findAppsFromSemanticTools(semanticTools);

  // console.log("User input:", input);
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
      // if (connection?.needsToConnect) {
      //   console.log(`User needs to connect ${app} at: ${connection.redirectUrl}`);
      // }
    } catch (err) {
      console.error(`Error connecting to ${app}:`, err);
    }
  console.log('toolset - ', toolset);
  }
  // 2. Fetch the actual tools for the selected apps
  const allTools = await toolset.getTools({ apps: semanticTools });
  
  // Build a custom system message with agent info, context, and instructions
  const systemMessage = `
# Agent Profile
You are ${finalAgentConfig.name}, ${finalAgentConfig.description}

# Available Tools
You have access to the following tools/apps:
${semanticTools.map(tool => `- ${tool}`).join('\n')}

# Context
${finalAgentConfig.context}

# Instructions
${finalAgentConfig.instructions}

# Response Guidelines
1. Always identify yourself as ${finalAgentConfig.name}
2. Use available tools when appropriate to fulfill user requests
3. Think step by step when solving complex problems
4. If you need information from a connected service, use the appropriate tool
5. Be helpful, concise, and professional in your responses
`;

  // Create the prompt template with system message, user input, and agent scratchpad
  const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", systemMessage],
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  // Create the agent with our custom prompt
  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools: allTools,
    prompt: promptTemplate,
  });
  // console.log("Agent created:", agent);

  // 5. Wrap it in an executor (verbose logs all steps)
  const agentExecutor = new AgentExecutor({ 
    agent, 
    tools: allTools, 
    verbose: false,
    callbacks: options?.callbacks || [new ConsoleCallbackHandler()]
  });

  // 6. Invoke the agent on the user's input
  const response = await agentExecutor.invoke({ input });
  console.log("Agent response:", response);

  return response;
}

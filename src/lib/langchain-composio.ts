import { ChatOpenAI } from "@langchain/openai";
import { createOpenAIFunctionsAgent, AgentExecutor } from "langchain/agents";
import { pull } from "langchain/hub";
import { LangchainToolSet } from "composio-core";
import { findToolsByUseCase } from './composio';

// Initialize the LangChain toolset for Composio
const toolset = new LangchainToolSet();

/**
 * Get langchain-compatible tools from Composio
 * @param apps Array of app names to get tools for (e.g. "github", "gmail")
 * @param useCase Optional natural language description to find relevant tools
 * @returns Array of LangChain-compatible tools
 */
export async function getLangChainTools(apps: string[] = [], useCase?: string) {
  try {
    let tools;
    
    // If a useCase is provided, use semantic search to find relevant tools
    if (useCase) {
      // First use our existing semantic search function to find relevant OpenAI tools
      const openAITools = await findToolsByUseCase(useCase, apps, true);
      
      // Extract the action names for these tools
      const actionNames = openAITools.map(tool => {
        // Use type assertion to access custom properties
        return (tool as any).metadata?.actionName || tool.function?.name;
      }).filter(Boolean);
      
      // Get LangChain versions of the same tools
      tools = await toolset.getTools({ 
        actions: actionNames as string[] 
      });
    } else {
      // Get all tools for the specified apps
      tools = await toolset.getTools({ 
        apps 
      });
    }
    
    return tools;
  } catch (error) {
    console.error('Error getting LangChain tools:', error);
    return [];
  }
}

/**
 * Convert OpenAI tool schemas to LangChain tools
 * @param openAITools Array of OpenAI tool schemas from Composio
 * @returns Array of LangChain-compatible tools
 */
export async function convertToLangChainTools(openAITools: any[]) {
  try {
    // Extract action names from the OpenAI tool schemas
    const actionNames = openAITools.map(tool => {
      // Use metadata.actionName if available, otherwise fall back to function.name
      return (tool as any).metadata?.actionName || tool.function?.name;
    }).filter(Boolean) as string[];
    
    console.log('Converting the following actions to LangChain tools:', actionNames);
    
    // Get LangChain tools for these actions
    const langchainTools = await toolset.getTools({ 
      actions: actionNames 
    });
    
    return langchainTools;
  } catch (error) {
    console.error('Error converting to LangChain tools:', error);
    return [];
  }
}

/**
 * Create a LangChain agent with Composio tools
 * @param tools Array of LangChain-compatible tools
 * @param apiKey OpenAI API key
 * @returns AgentExecutor that can be used to run the agent
 */
export async function createComposioAgent(tools: any[], apiKey?: string) {
  try {
    // Create LLM instance
    const llm = new ChatOpenAI({
      apiKey: apiKey,
      temperature: 0.7,
      modelName: "gpt-3.5-turbo"
    });
    
    // Pull agent prompt from LangChain hub
    const promptFromHub = await pull("hwchase17/openai-functions-agent");
    
    // Create the agent with the prompt from hub
    const agent = await createOpenAIFunctionsAgent({
      llm,
      tools,
      prompt: promptFromHub,
    });
    
    // Create and return the executor
    const agentExecutor = new AgentExecutor({ 
      agent, 
      tools, 
      verbose: true,
      returnIntermediateSteps: true
    });
    
    return agentExecutor;
  } catch (error) {
    console.error('Error creating Composio agent:', error);
    throw error;
  }
}

/**
 * Run a Composio-powered LangChain agent with the given input
 * @param input User's query
 * @param apps Array of app names to consider (e.g. "github", "gmail")
 * @param apiKey Optional OpenAI API key
 * @returns The agent's response and any intermediate steps
 */
export async function runComposioAgent(input: string, apps: string[] = [], apiKey?: string) {
  try {
    // Get relevant tools based on the input
    const tools = await getLangChainTools(apps, input);
    
    if (!tools.length) {
      return {
        output: "I couldn't find appropriate tools to handle your request.",
        steps: []
      };
    }
    
    // Create the agent
    const agentExecutor = await createComposioAgent(tools, apiKey);
    
    // Run the agent
    const result = await agentExecutor.invoke({ input });
    
    return {
      output: result.output,
      steps: result.intermediateSteps || []
    };
  } catch (error) {
    console.error('Error running Composio agent:', error);
    return {
      output: `I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}`,
      steps: []
    };
  }
}

/**
 * Run a Composio-powered LangChain agent with pre-fetched semantic tools
 * @param input User's query
 * @param semanticTools Array of semantic tools from findToolsByUseCase
 * @param apiKey Optional OpenAI API key
 * @returns The agent's response and any intermediate steps
 */
export async function runComposioAgentWithTools(input: string, semanticTools: any[], apiKey?: string) {
  try {
    console.log(`Converting ${semanticTools.length} semantic tools to LangChain format...`);
    
    // Convert the OpenAI tool schemas to LangChain tools
    const langchainTools = await convertToLangChainTools(semanticTools);
    
    if (!langchainTools.length) {
      return {
        output: "I couldn't convert the tools to a format LangChain can use.",
        steps: []
      };
    }
    
    console.log(`Successfully converted ${langchainTools.length} tools. Creating agent...`);
    
    // Create the agent with these tools
    const agentExecutor = await createComposioAgent(langchainTools, apiKey);
    
    // Run the agent with the user's input
    console.log('Executing LangChain agent with user prompt...');
    const result = await agentExecutor.invoke({ input });
    
    console.log('LangChain execution complete');
    return {
      output: result.output,
      steps: result.intermediateSteps || []
    };
  } catch (error) {
    console.error('Error running Composio agent with semantic tools:', error);
    return {
      output: `I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}`,
      steps: []
    };
  }
}

/**
 * Initialize a connection with a specific app
 * @param appName The name of the app to connect (e.g., "github", "gmail", "whatsapp")
 * @returns The connection request with redirect URL
 */
export async function initiateConnection(appName: string) {
  try {
    const connection = await toolset.connectedAccounts.initiate({
      appName: appName
    });
    
    return connection;
  } catch (error) {
    console.error(`Error initiating ${appName} connection:`, error);
    throw error;
  }
} 
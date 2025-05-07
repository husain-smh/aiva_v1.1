import { ChatOpenAI } from "@langchain/openai";
import { createOpenAIFunctionsAgent, AgentExecutor } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { LangchainToolSet } from "composio-core";
import { pull } from "langchain/hub";
import { findToolsByUseCase } from "./composio";
import { getServerSession } from "next-auth";
import { ConsoleCallbackHandler } from "@langchain/core/tracers/console";

// Helper function: Find apps from semantic tools
// function findAppsFromSemanticTools(semanticTools: any[]): string[] {
//   const apps = semanticTools.map(tool => {
//     const functionName = tool.function.name; // example: "GITHUB_CREATE_A_REPOSITORY_USING_A_TEMPLATE"
//     const appName = functionName.split('_')[0]; // take the part before first "_"
//     return appName.toLowerCase(); // "GITHUB" -> "github"
//   });

//   return Array.from(new Set(apps)); // remove duplicates
// }

export async function executingTheTools(
  input: string,
  semanticTools: string[],
  options?: { callbacks?: any[] }
) {
   // 1. Detect apps needed
  //  const serviceType = findAppsFromSemanticTools(semanticTools);

  // console.log("User input:", input);
  console.log("Semantic tools pre-filtered:", semanticTools);
  const session = await getServerSession();
const llm = new ChatOpenAI();
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
  

  // 3. Build a ChatPromptTemplate with exactly three roles:
  const prompt = await pull<ChatPromptTemplate>("hwchase17/openai-functions-agent");

  // semanticTools is now [<appName>,…], so you no longer extract .function.name off it.
  // Instead just hand the full set of tools back to the agent:
  const tools = allTools;

  // 4. Create the OpenAI-Functions agent
  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools,
    prompt,
  });
  // console.log("Agent created:", agent);

  // 5. Wrap it in an executor (verbose logs all steps)
  const agentExecutor = new AgentExecutor({ 
    agent, 
    tools, 
    verbose: false,
    callbacks: options?.callbacks || [new ConsoleCallbackHandler()]
  });

  // 6. Invoke the agent on the user's input
  const response = await agentExecutor.invoke({ input });
  console.log("Agent response:", response);

  return response;
}

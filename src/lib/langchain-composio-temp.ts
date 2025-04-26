import { ChatOpenAI } from "@langchain/openai";
import { createOpenAIFunctionsAgent, AgentExecutor } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { LangchainToolSet } from "composio-core";
import { pull } from "langchain/hub";
import { findToolsByUseCase } from "./composio";

const llm = new ChatOpenAI();
const toolset = new LangchainToolSet();

export async function executingTheTools(
  input: string,
  semanticTools: any[],
  apiKey?: string
) {
  console.log("User input:", input);
  console.log("Semantic tools pre-filtered:", semanticTools);

  // 1. Ensure user has connected their Gmail account
  const connection = await toolset.connectedAccounts.initiate({ appName: "gmail" });
  console.log("Connection request:", connection);
  console.log(`Open this URL to authenticate: ${connection.redirectUrl}`);

  // 2. Fetch the actual tools for Gmail
  const tools = await toolset.getTools({ apps: ["gmail"] });

  // 3. Build a ChatPromptTemplate with exactly three roles:
  const prompt = await pull<ChatPromptTemplate>("hwchase17/openai-functions-agent");

  // 4. Create the OpenAI-Functions agent
  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools: tools,
    prompt,
  });
  console.log("Agent created:", agent);

  // 5. Wrap it in an executor (verbose logs all steps)
  const agentExecutor = new AgentExecutor({ agent, tools, verbose: true });

  // 6. Invoke the agent on the user’s input
  const response = await agentExecutor.invoke({ input });
  console.log("Agent response:", response);

  return response;
}

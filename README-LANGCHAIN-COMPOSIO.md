# LangChain-Composio Integration

This document explains how the LangChain integration with Composio works in this application.

## Overview

The integration allows the application to use Composio's semantic tool searching capabilities with LangChain's agent framework. This enables more complex tool usage patterns and provides a better user experience for actions like sending emails, searching repositories, and interacting with various external services.

## File Structure

- `src/lib/langchain-composio.ts` - Core integration utilities
- `src/lib/composio.ts` - Base Composio utilities
- `src/app/api/message/route.ts` - API endpoint that leverages both direct OpenAI and LangChain approaches

## How It Works

The flow follows these specific steps:

1. **Get User Prompt**: The system receives the user's prompt through the message API.

2. **Find Semantic Tools**: The system uses Composio's semantic search capabilities to find the most relevant tools for the user's prompt.
   ```javascript
   const semanticTools = await findToolsByUseCase(content, supportedApps, true);
   ```

3. **Pass to LangChain**: If semantic tools are found, they are converted to LangChain format and passed along with the user's prompt to the LangChain agent.
   ```javascript
   const langchainResponse = await runComposioAgentWithTools(content, semanticTools);
   ```

4. **Execute with User Permissions**: LangChain executes the tools using the user's established permissions for connected apps (Gmail, GitHub, etc.).

5. **Return Results**: The system returns the results to the user with any relevant steps taken by the agent.

## Key Functions

### From `langchain-composio.ts`

- `convertToLangChainTools` - Converts OpenAI tool schemas to LangChain compatible tools
- `createComposioAgent` - Creates a LangChain agent with Composio tools
- `runComposioAgentWithTools` - Runs the agent with pre-fetched semantic tools
- `initiateConnection` - Initializes a connection with a specific app

### From `message/route.ts`

- `POST` handler - Manages the entire flow from user input to response
- `processWithOpenAI` - Fallback method for direct OpenAI calls when semantic tools aren't found

## Usage Example

```javascript
// 1. Get user prompt
const userPrompt = "Star the repository composiohq/composio on GitHub";

// 2. Find semantic tools needed based on the prompt
const supportedApps = ["github", "gmail","whatsapp","calendar"];
const semanticTools = await findToolsByUseCase(userPrompt, supportedApps, true);

// 3. Pass prompt and semantic tools to LangChain for execution
const langchainResponse = await runComposioAgentWithTools(userPrompt, semanticTools);

// 4. Use the response
console.log(langchainResponse.output); // The agent's response
console.log(langchainResponse.steps);  // The steps the agent took
```

## Supported Apps

The integration currently supports:
- Gmail
- GitHub
- Notion
- Slack
- Jira

You can extend this by adding more apps to the `supportedApps` array in the relevant functions.

## User Permissions and Authentication

The system leverages user-provided permissions for each connected app. When users connect apps via Composio (e.g., connecting their GitHub account), the system can use those permissions to execute tools on their behalf.

For new connections, the `initiateConnection` function generates authorization URLs:

```javascript
const connection = await initiateConnection("github");
console.log(`Open this URL to connect your GitHub account: ${connection.redirectUrl}`);
```

## Error Handling

The integration includes robust error handling at multiple levels:
- Tool retrieval errors
- Conversion errors between OpenAI and LangChain formats
- Agent execution errors
- Tool execution errors

Each error is logged and propagated appropriately, with fallback mechanisms in place.

## Performance Considerations

- Semantic tool search ensures only relevant tools are loaded
- Direct OpenAI function calling is used as a fallback when appropriate
- Converting between tool formats adds minimal overhead

## Future Improvements

- Implement caching for tool schemas to improve performance
- Add support for more apps and actions
- Implement memory for multi-turn conversations with tools
- Add user preference settings for tool execution 
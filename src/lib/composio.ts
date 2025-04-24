import { OpenAIToolSet } from "composio-core";

// Initialize the ToolSet with API key from environment variable
const toolset = new OpenAIToolSet();

// List of commonly used actions as constants
export const COMPOSIO_ACTIONS = {
  // Gmail actions
  GMAIL_SEND_AN_EMAIL: "GMAIL_SEND_AN_EMAIL",
  GMAIL_GET_CONTACTS: "GMAIL_GET_CONTACTS",
  
  // GitHub actions
  GITHUB_STAR_A_REPOSITORY_FOR_THE_AUTHENTICATED_USER: "GITHUB_STAR_A_REPOSITORY_FOR_THE_AUTHENTICATED_USER",
  GITHUB_GET_THE_AUTHENTICATED_USER: "GITHUB_GET_THE_AUTHENTICATED_USER",
  GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER: "GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER"
};

/**
 * Fetch Composio tool schemas for OpenAI
 * @param actions Array of action names to fetch
 * @returns Array of tool schemas formatted for OpenAI
 */
export async function loadComposioTools(actions: string[] = []) {
  try {
    // Using the official method from documentation
    const tools = await toolset.getTools({
      actions: actions
    });
    
    return tools;
  } catch (error) {
    console.error('Error loading Composio tools:', error);
    return [];
  }
}

/**
 * Fetch tools for a specific app
 * @param apps Array of app names
 * @returns Array of tool schemas
 */
export async function loadToolsByApp(apps: string[] = []) {
  try {
    const tools = await toolset.getTools({
      apps: apps
    });
    
    return tools;
  } catch (error) {
    console.error('Error loading tools by app:', error);
    return [];
  }
}

/**
 * Find and load tools based on a natural language description
 * @param useCase Natural language description of what the user wants to do
 * @param apps Optional array of app names to filter by
 * @param advanced Whether to search for multiple tools that might work together
 * @returns Array of relevant tool schemas
 */
export async function findToolsByUseCase(useCase: string, apps: string[] = [], advanced: boolean = true) {
  try {
    // Create params with required fields
    // The Composio API requires apps to be an array even if empty
    const params: any = {
      useCase: useCase,
      apps: apps.length > 0 ? apps : ["gmail", "github"] // Default to these common apps if none specified
    };
    
    // Add advanced flag if supported
    if (advanced) {
      try {
        params.advanced = true;
      } catch (e) {
        console.log('Advanced flag not supported in this version of Composio SDK');
      }
    }
    
    // Find relevant action ENUMs using semantic search
    console.log('Searching for tools matching use case:', useCase);
    console.log('Using apps filter:', params.apps);
    console.log('params = ', params);
    
    const relevantActions = await toolset.client.actions.findActionEnumsByUseCase(params);
    
    console.log('Found relevant actions:', relevantActions);
    
    if (relevantActions && relevantActions.length > 0) {
      // Fetch the actual tool schemas for the found actions
      const tools = await toolset.getTools({ actions: relevantActions });
      return tools;
    }
    
    return [];
  } catch (error) {
    console.error('Error finding tools by use case:', error);
    return [];
  }
}

/**
 * Execute a Composio tool with the given parameters
 * @param name The action name from the OpenAI function call
 * @param args The arguments from the OpenAI function call
 * @returns Result of the tool execution
 */
export async function executeComposioTool(name: string, args: Record<string, any>) {
  try {
    // Based on Composio TypeScript documentation
    // Use the client directly to execute the action
    const result = await toolset.client.actions.execute({
      actionName: name,
      requestBody: args
    });
    
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(`Error executing Composio tool ${name}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

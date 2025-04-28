import { OpenAIToolSet } from "composio-core";

// Initialize the ToolSet with API key from environment variable
const toolset = new OpenAIToolSet();

// List of commonly used actions as constants
export const COMPOSIO_ACTIONS = {
  // Gmail actions
  GMAIL_SEND_AN_EMAIL: "GMAIL_SEND_AN_EMAIL",
  GMAIL_GET_CONTACTS: "GMAIL_GET_CONTACTS",
  
  // WhatsApp actions
  WHATSAPP_SEND_MESSAGE: "WHATSAPP_SEND_MESSAGE",
  WHATSAPP_GET_CONVERSATIONS: "WHATSAPP_GET_CONVERSATIONS",
  WHATSAPP_GET_MESSAGES: "WHATSAPP_GET_MESSAGES",
  
  // GitHub actions
  GITHUB_STAR_A_REPOSITORY_FOR_THE_AUTHENTICATED_USER: "GITHUB_STAR_A_REPOSITORY_FOR_THE_AUTHENTICATED_USER",
  GITHUB_GET_THE_AUTHENTICATED_USER: "GITHUB_GET_THE_AUTHENTICATED_USER",
  GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER: "GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER"
};

/**
 * Get and log all connected accounts for a specific app
 * @param appName The name of the app (e.g., "github", "gmail")
 * @returns Array of connected accounts or null if error
 */
export async function getConnectedAccounts(appName: string) {
  try {
    console.log(`Fetching connected accounts for ${appName}...`);
    
    // Fetch connected accounts for this app
    const connectedAccounts = await (toolset.client as any).connectedAccounts.list({
      appNames: [appName]
    });
    
    if (connectedAccounts && Array.isArray(connectedAccounts) && connectedAccounts.length > 0) {
      console.log(`Found ${connectedAccounts.length} connected ${appName} accounts:`);
      
      // Log details about each account
      connectedAccounts.forEach((account: any, index: number) => {
        console.log(`--- Account ${index + 1} ---`);
        // Log identifier (often email) if available
        if (account.identifier) {
          console.log(`Identifier: ${account.identifier}`);
        }
        // Log when it was connected
        if (account.createdAt) {
          console.log(`Connected on: ${new Date(account.createdAt).toLocaleString()}`);
        }
        // Log if it's the default account
        if (account.isDefault) {
          console.log(`Default account: Yes`);
        }
        console.log('-------------------');
      });
      
      return connectedAccounts;
    } else {
      console.log(`No accounts connected for ${appName}`);
      return null;
    }
  } catch (error) {
    const err = error as Error;
    console.error(`Error fetching connected accounts for ${appName}:`, err.message);
    return null;
  }
}

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
export async function findToolsByUseCase(useCase: string, apps: string[], advanced: boolean = true) {
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
    // Log which action is being executed
    console.log(`Executing Composio action: ${name}`);
    
    // Get information about the connected account being used
    try {
      // Get the app name from the action name (usually the prefix before the first underscore)
      const appName = name.split('_')[0].toLowerCase();
      console.log(`Checking connected accounts for app: ${appName}`);
      
      // Fetch connected accounts for this app using the client's API
      // Note: Using any to bypass type issues with the Composio SDK
      const connectedAccounts = await (toolset.client as any).connectedAccounts.list({
        appNames: [appName]
      });
      
      // Safely check and log connected accounts
      if (connectedAccounts && Array.isArray(connectedAccounts) && connectedAccounts.length > 0) {
        // Log information about the account(s)
        console.log(`Found ${connectedAccounts.length} connected accounts for ${appName}`);
        
        // Log details about each account (safely, without exposing sensitive info)
        connectedAccounts.forEach((account: any, index: number) => {
          console.log(`Account ${index + 1}:`);
          // Log identifier (often email) if available
          if (account.identifier) {
            console.log(`- Identifier: ${account.identifier}`);
          }
          // Log when it was connected
          if (account.createdAt) {
            console.log(`- Connected on: ${new Date(account.createdAt).toLocaleString()}`);
          }
          // Log if it's the default account
          if (account.isDefault) {
            console.log(`- This is the default account`);
          }
        });
        
        // Indicate which account will be used (typically the default or first one)
        const activeAccount = connectedAccounts.find((acc: any) => acc.isDefault) || connectedAccounts[0];
        if (activeAccount && activeAccount.identifier) {
          console.log(`Using account: ${activeAccount.identifier}`);
        } else {
          console.log('Using account: Details not available');
        }
      } else {
        console.log(`No connected accounts found for ${appName}`);
      }
    } catch (error) {
      // Properly type the error
      const accountError = error as Error;
      console.log(`Unable to fetch account information: ${accountError.message}`);
    }
    
    // Based on Composio TypeScript documentation
    // Use the client directly to execute the action
    const result = await toolset.client.actions.execute({
      actionName: name,
      requestBody: args
    });
    
    console.log(`Action ${name} executed successfully`);
    
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

/**
 * Find Gmail tools based on use case
 * @param useCase specific use case for Gmail (e.g., "sendEmail", "getContacts")
 * @returns Array of Gmail action IDs matching the use case
 */
export function findGmailTools(useCase?: string) {
  // If no specific use case, return all Gmail actions
  if (!useCase) {
    return Object.keys(COMPOSIO_ACTIONS)
      .filter(key => key.startsWith('GMAIL_'))
      .map(key => COMPOSIO_ACTIONS[key as keyof typeof COMPOSIO_ACTIONS]);
  }

  // Map use case to specific Gmail actions
  switch (useCase.toLowerCase()) {
    case 'sendemail':
      return [COMPOSIO_ACTIONS.GMAIL_SEND_AN_EMAIL];
    case 'getcontacts':
      return [COMPOSIO_ACTIONS.GMAIL_GET_CONTACTS];
    default:
      return [];
  }
}

/**
 * Find WhatsApp tools based on use case
 * @param useCase specific use case for WhatsApp (e.g., "sendMessage", "getConversations")
 * @returns Array of WhatsApp action IDs matching the use case
 */
export function findWhatsAppTools(useCase?: string) {
  // If no specific use case, return all WhatsApp actions
  if (!useCase) {
    return Object.keys(COMPOSIO_ACTIONS)
      .filter(key => key.startsWith('WHATSAPP_'))
      .map(key => COMPOSIO_ACTIONS[key as keyof typeof COMPOSIO_ACTIONS]);
  }

  // Map use case to specific WhatsApp actions
  switch (useCase.toLowerCase()) {
    case 'sendmessage':
      return [COMPOSIO_ACTIONS.WHATSAPP_SEND_MESSAGE];
    case 'getconversations':
      return [COMPOSIO_ACTIONS.WHATSAPP_GET_CONVERSATIONS];
    case 'getmessages':
      return [COMPOSIO_ACTIONS.WHATSAPP_GET_MESSAGES];
    default:
      return [];
  }
}

/**
 * Find GitHub tools based on use case
 * @param useCase specific use case for GitHub (e.g., "starRepository", "getUser", "listRepositories")
 * @returns Array of GitHub action IDs matching the use case
 */
export function findGitHubTools(useCase?: string) {
  // If no specific use case, return all GitHub actions
  if (!useCase) {
    return Object.keys(COMPOSIO_ACTIONS)
      .filter(key => key.startsWith('GITHUB_'))
      .map(key => COMPOSIO_ACTIONS[key as keyof typeof COMPOSIO_ACTIONS]);
  }

  // Map use case to specific GitHub actions
  switch (useCase.toLowerCase()) {
    case 'starrepository':
      return [COMPOSIO_ACTIONS.GITHUB_STAR_A_REPOSITORY_FOR_THE_AUTHENTICATED_USER];
    case 'getuser':
      return [COMPOSIO_ACTIONS.GITHUB_GET_THE_AUTHENTICATED_USER];
    case 'listrepositories':
      return [COMPOSIO_ACTIONS.GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER];
    default:
      return [];
  }
}

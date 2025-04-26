// A simple script to check and log which accounts are connected in Composio
// Run with: node src/scripts/check-accounts.js <app-name>
// Example: node src/scripts/check-accounts.js gmail

// Import the dotenv package to load environment variables
require('dotenv').config();

// Dynamically import ESM modules
async function main() {
  try {
    // Import the Composio utility
    const { getConnectedAccounts } = await import('../lib/composio.js');
    
    // Get app name from command line or use default
    const appName = process.argv[2] || 'all';
    
    console.log('--------------------------------------');
    console.log('COMPOSIO CONNECTED ACCOUNTS CHECKER');
    console.log('--------------------------------------');
    
    if (appName === 'all') {
      // Check all commonly used apps
      const apps = ['gmail', 'github', 'notion', 'slack', 'jira'];
      console.log(`Checking all supported apps: ${apps.join(', ')}`);
      
      for (const app of apps) {
        console.log(`\n== ${app.toUpperCase()} ==`);
        await getConnectedAccounts(app);
      }
    } else {
      // Check just the specified app
      console.log(`Checking accounts for: ${appName}`);
      const accounts = await getConnectedAccounts(appName);
      
      if (accounts) {
        // If accounts exist, print a summary
        console.log(`\nSUMMARY: Found ${accounts.length} connected ${appName} accounts`);
        
        // Show which one is active (default)
        const defaultAccount = accounts.find(acc => acc.isDefault);
        if (defaultAccount) {
          console.log(`Active account: ${defaultAccount.identifier || 'Unknown'}`);
        }
      }
    }
    
    console.log('\n--------------------------------------');
    console.log('CHECK COMPLETE');
    console.log('--------------------------------------');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error); 
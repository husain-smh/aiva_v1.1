import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { AgentAction, AgentFinish } from "@langchain/core/agents";
import { ChainValues } from "@langchain/core/utils/types";

/**
 * Callback handler that specifically tracks tool calls made by LangChain agents
 */
export class ToolTrackingCallbackHandler extends BaseCallbackHandler {
  name = "ToolTrackingCallbackHandler";
  toolCalls: { tool: string; input: any; output?: any }[] = [];
  
  constructor() {
    super();
  }

  /**
   * Called when an agent is about to execute a tool
   */
  async handleAgentAction(
    action: AgentAction
  ): Promise<void> {
    // Record the tool being called and its input
    this.toolCalls.push({
      tool: action.tool,
      input: action.toolInput,
    });
    
    console.log(`[TOOL CALL] ${action.tool}`, JSON.stringify(action.toolInput, null, 2));
  }

  /**
   * Called after a tool execution is completed
   */
  async handleToolEnd(
    output: string,
    runId: string,
  ): Promise<void> {
    // Find the most recent tool call and add its output
    if (this.toolCalls.length > 0) {
      const lastToolCall = this.toolCalls[this.toolCalls.length - 1];
      lastToolCall.output = output;
      
      console.log(`[TOOL RESULT] ${lastToolCall.tool}`, output);
    }
  }

  /**
   * Called when the agent finishes its execution
   */
  async handleAgentEnd(action: AgentFinish): Promise<void> {
    console.log("[AGENT FINISHED]", action.returnValues);
  }
  
  /**
   * Called when the chain finishes execution
   */
  async handleChainEnd(outputs: ChainValues): Promise<void> {
    console.log("[CHAIN FINISHED]");
    console.log("Tool execution summary:");
    
    if (this.toolCalls.length === 0) {
      console.log("No tools were called during this execution");
    } else {
      this.toolCalls.forEach((call, index) => {
        console.log(`${index + 1}. ${call.tool}`);
        console.log(`   Input: ${JSON.stringify(call.tool === "GMAIL_SEND_EMAIL" ? 
          this.sanitizeEmailDetails(call.input) : 
          call.input, null, 2)}`);
        console.log(`   Output: ${typeof call.output === 'string' ? call.output.substring(0, 100) + (call.output.length > 100 ? '...' : '') : JSON.stringify(call.output, null, 2)}`);
      });
    }
  }
  
  /**
   * Helper to sanitize email details for privacy in logs
   */
  private sanitizeEmailDetails(input: any): any {
    if (!input) return input;
    
    const sanitized = {...input};
    
    // Mask email addresses except domain
    if (sanitized.recipient_email) {
      const parts = sanitized.recipient_email.split('@');
      if (parts.length === 2) {
        sanitized.recipient_email = `***@${parts[1]}`;
      }
    }
    
    // Trim body content for brevity
    if (sanitized.body && typeof sanitized.body === 'string') {
      sanitized.body = sanitized.body.substring(0, 50) + (sanitized.body.length > 50 ? '...' : '');
    }
    
    return sanitized;
  }
  
  /**
   * Reset the callback handler state
   */
  reset(): void {
    this.toolCalls = [];
  }
  
  /**
   * Get the collected tool execution data
   */
  getToolExecutionData() {
    return [...this.toolCalls];
  }
}
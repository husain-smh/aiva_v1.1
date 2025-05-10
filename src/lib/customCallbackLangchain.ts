import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { Serialized } from "@langchain/schema"; // Ensure you import the correct type

export class ToolLoggerHandler extends BaseCallbackHandler {
  public toolLogs: any[] = [];

  // ✅ `lc_name` must now be a method that returns a string
  static lc_name() {
    return "ToolLoggerHandler";
  }

  // ✅ `lc_namespace` still needs to be a tuple with 3 elements
  static lc_namespace: [string, string, string] = [
    "langchain_core",
    "callbacks",
    "tool_logger",
  ];

  name = "tool-logger-handler";

  async handleToolStart(
    tool: Serialized,  // Use the `Serialized` type here
    input: string,
    runId: string,
    parentRunId?: string,
    tags?: string[],
    metadata?: Record<string, unknown>,
    runName?: string
  ) {
    if (!tool.name) {
      console.warn(`Tool name is undefined for runId: ${runId}`);
      return;
    }

    let parsedArgs: any = {};
    try {
      parsedArgs = JSON.parse(input);
    } catch {
      parsedArgs = { rawInput: input };
    }

    this.toolLogs.push({
      toolName: tool.name,
      args: parsedArgs,
      status: "started",
      runId,
    });
  }

  async handleToolEnd(output: string, runId: string) {
    const log = this.toolLogs.find((l) => l.runId === runId);
    if (log) {
      log.status = "completed";
      log.output = output;
    }
  }

  async handleToolError(error: Error, runId: string) {
    const log = this.toolLogs.find((l) => l.runId === runId);
    if (log) {
      log.status = "error";
      log.error = error.message;
    }
  }
}

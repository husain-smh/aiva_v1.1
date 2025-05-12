import { Message } from '@/models/Message';
import { connectToDatabase } from './mongodb';

/**
 * ShortTermMemory class for maintaining context across conversation turns
 * Stores and retrieves the most recent messages for a chat
 */
export class ShortTermMemory {
  private chatId: string;
  private agentId: string | undefined;
  private messageLimit: number;

  constructor(chatId: string, agentId?: string, messageLimit: number = 10) {
    this.chatId = chatId;
    this.agentId = agentId;
    this.messageLimit = messageLimit;
  }

  /**
   * Adds a message to the chat's short-term memory
   * @param role The role of the message sender ('user' or 'assistant')
   * @param content The message content
   * @returns The saved message object
   */
  async addMessage(role: 'user' | 'assistant', content: string): Promise<any> {
    await connectToDatabase();
    
    const message = await Message.create({
      chatId: this.chatId,
      agentId: this.agentId,
      role,
      content,
    });
    
    return message;
  }

  /**
   * Retrieves the most recent messages from the chat's short-term memory
   * @returns An array of the most recent messages, limited by messageLimit
   */
  async getRecentMessages(): Promise<any[]> {
    await connectToDatabase();
    
    const messages = await Message.find({ chatId: this.chatId })
      .sort({ createdAt: -1 })
      .limit(this.messageLimit)
      .lean();
    
    // Return in chronological order (oldest first)
    return messages.reverse();
  }

  /**
   * Formats the recent messages for use with OpenAI API
   * @returns An array of message objects formatted for OpenAI
   */
  async getFormattedContextMessages(): Promise<Array<{ role: string, content: string }>> {
    const messages = await this.getRecentMessages();
    
    return messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));
  }

  /**
   * Clears all messages for this chat
   */
  async clearMessages(): Promise<void> {
    await connectToDatabase();
    await Message.deleteMany({ chatId: this.chatId });
  }

  /**
   * Formats the conversation context as a string for inclusion in agent instructions
   * @returns A formatted string representation of recent conversation
   */
  async getContextString(): Promise<string> {
    const messages = await this.getRecentMessages();
    
    if (messages.length === 0) {
      return "No previous conversation.";
    }
    
    const formattedContext = messages.map(msg => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      return `${role}: ${msg.content}`;
    }).join('\n');
    
    return formattedContext;
  }
}

/**
 * Creates a ShortTermMemory instance for the specified chat and agent
 */
export function createShortTermMemory(chatId: string, agentId?: string, messageLimit: number = 10): ShortTermMemory {
  return new ShortTermMemory(chatId, agentId, messageLimit);
} 
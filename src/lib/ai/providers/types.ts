import { AIContext, AIMessage, AIProviderType } from '@/types/ai';
import { ToolCall } from '../tools/types';

/**
 * Streaming chunk types
 */
export type StreamChunk =
  | { type: 'text'; content: string }
  | { type: 'tool_calls'; toolCalls: ToolCall[] }
  | { type: 'done' };

/**
 * Options for sending messages
 */
export interface SendMessageOptions {
  enableTools?: boolean;
}

/**
 * AI Provider interface
 * All AI providers must implement this interface
 */
export interface AIProvider {
  /** Provider name */
  name: AIProviderType;

  /**
   * Send a message and get a streaming response
   * @param messages - Array of messages in the conversation
   * @param context - Current context (task, project, user info)
   * @param apiKey - API key for the provider
   * @param model - Model to use (optional, uses default if not provided)
   * @param options - Additional options
   * @returns AsyncGenerator that yields stream chunks
   */
  sendMessage(
    messages: AIMessage[],
    context: AIContext,
    apiKey: string,
    model?: string,
    options?: SendMessageOptions
  ): AsyncGenerator<StreamChunk, void, unknown>;
}

/**
 * Configuration for AI Provider
 */
export interface AIProviderConfig {
  apiKey: string;
  model?: string;
}

/**
 * Request payload for chat API
 */
export interface ChatAPIRequest {
  projectId: string;
  conversationId?: string;
  message: string;
  context: AIContext;
  provider: AIProviderType;
  apiKey: string;
  model?: string;
}

/**
 * System prompt builder options
 */
export interface SystemPromptOptions {
  context: AIContext;
  language?: 'ja' | 'en';
}

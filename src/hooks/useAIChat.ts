'use client';

import React, { useState, useCallback } from 'react';
import { AIContext, AIMessage } from '@/types/ai';
import { useAISettingsStore } from '@/stores/aiSettingsStore';
import { ToolCall, ToolResult } from '@/lib/ai/tools/types';

interface UseAIChatOptions {
  onMessageUpdate?: (content: string) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: string) => void;
  onToolCalls?: (toolCalls: ToolCall[]) => void;
  enableTools?: boolean;
}

interface UseAIChatReturn {
  messages: AIMessage[];
  isLoading: boolean;
  error: string | null;
  pendingToolCalls: ToolCall[] | null;
  sendMessage: (content: string, context: AIContext) => Promise<void>;
  sendToolResults: (toolCalls: ToolCall[], results: ToolResult[], context: AIContext) => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<AIMessage[]>>;
  clearMessages: () => void;
  clearPendingToolCalls: () => void;
}

export function useAIChat(options: UseAIChatOptions = {}): UseAIChatReturn {
  const { onMessageUpdate, onComplete, onError, onToolCalls, enableTools } = options;
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingToolCalls, setPendingToolCalls] = useState<ToolCall[] | null>(null);

  const { provider, getActiveApiKey, getActiveModel } = useAISettingsStore();

  const sendMessage = useCallback(
    async (content: string, context: AIContext) => {
      const apiKey = getActiveApiKey();
      const model = getActiveModel();

      console.log('[AI Chat] sendMessage called', {
        provider,
        model,
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length || 0
      });

      if (!apiKey) {
        const errorMsg = 'APIキーが設定されていません。設定画面からAPIキーを設定してください。';
        console.error('[AI Chat] No API key');
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      setIsLoading(true);
      setError(null);

      // Add user message
      const userMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        createdAt: new Date(),
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);

      // Create placeholder for assistant message
      const assistantMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        createdAt: new Date(),
      };

      setMessages([...newMessages, assistantMessage]);

      try {
        console.log('[AI Chat] Calling /api/ai/chat...');
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: newMessages,
            context,
            provider,
            apiKey,
            model,
            enableTools,
          }),
        });

        console.log('[AI Chat] Response status:', response.status, response.ok);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('[AI Chat] API error:', errorData);
          throw new Error(errorData.error || 'API request failed');
        }

        const reader = response.body?.getReader();
        if (!reader) {
          console.error('[AI Chat] No response body');
          throw new Error('No response body');
        }

        console.log('[AI Chat] Starting to read stream...');

        const decoder = new TextDecoder();
        let fullContent = '';
        let chunkCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('[AI Chat] Stream ended. Total chunks:', chunkCount, 'Content length:', fullContent.length);
            break;
          }

          const chunk = decoder.decode(value);
          chunkCount++;
          console.log('[AI Chat] Received chunk', chunkCount, ':', chunk.substring(0, 200));

          const lines = chunk.split('\n').filter((line) => line.trim() !== '');
          console.log('[AI Chat] Lines in chunk:', lines.length);

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              console.log('[AI Chat] SSE data:', data.substring(0, 100));
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                console.log('[AI Chat] Parsed:', parsed.type, parsed.content?.substring(0, 50));
                if (parsed.error) {
                  console.error('[AI Chat] Stream error:', parsed.error);
                  throw new Error(parsed.error);
                }

                // Handle different event types
                if (parsed.type === 'text' && parsed.content) {
                  fullContent += parsed.content;
                  console.log('[AI Chat] Added text, total length:', fullContent.length);

                  // Update assistant message with accumulated content
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    if (updated[lastIndex]?.role === 'assistant') {
                      updated[lastIndex] = {
                        ...updated[lastIndex],
                        content: fullContent,
                      };
                    }
                    return updated;
                  });

                  onMessageUpdate?.(fullContent);
                } else if (parsed.type === 'tool_calls' && parsed.toolCalls) {
                  // Handle tool calls - save for confirmation
                  setPendingToolCalls(parsed.toolCalls);
                  // await to prevent race condition with state sync
                  await onToolCalls?.(parsed.toolCalls);
                } else if (parsed.content) {
                  // Backward compatibility for old format
                  fullContent += parsed.content;

                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    if (updated[lastIndex]?.role === 'assistant') {
                      updated[lastIndex] = {
                        ...updated[lastIndex],
                        content: fullContent,
                      };
                    }
                    return updated;
                  });

                  onMessageUpdate?.(fullContent);
                }
              } catch (e) {
                if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
                  throw e;
                }
              }
            }
          }
        }

        onComplete?.(fullContent);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        onError?.(errorMessage);

        // Remove the empty assistant message on error
        setMessages(newMessages);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, provider, getActiveApiKey, getActiveModel, onMessageUpdate, onComplete, onError, onToolCalls, enableTools]
  );

  /**
   * Send tool execution results back to the AI for natural language interpretation
   * This creates a proper conversation flow where:
   * 1. The last assistant message is updated with tool call info
   * 2. Tool result messages are added
   * 3. AI responds with natural language interpretation
   */
  const sendToolResults = useCallback(
    async (toolCalls: ToolCall[], results: ToolResult[], context: AIContext) => {
      const apiKey = getActiveApiKey();
      const model = getActiveModel();

      console.log('[AI Chat] sendToolResults called', {
        provider,
        toolCallCount: toolCalls.length,
        resultCount: results.length
      });

      if (!apiKey) {
        const errorMsg = 'APIキーが設定されていません。';
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      setIsLoading(true);
      setError(null);

      // Build the message history for the AI
      // 1. Get current messages
      // 2. Update the last assistant message to include tool calls
      // 3. Add tool result messages
      const updatedMessages = [...messages];
      const lastIndex = updatedMessages.length - 1;

      // Update the last assistant message to include tool call information
      if (updatedMessages[lastIndex]?.role === 'assistant') {
        updatedMessages[lastIndex] = {
          ...updatedMessages[lastIndex],
          toolCalls: toolCalls.map((tc) => ({
            id: tc.id,
            name: tc.name,
            arguments: tc.arguments,
            // Gemini 3: Include thought signature for function calls
            thoughtSignature: tc.thoughtSignature,
          })),
        };
      }

      // Add tool result messages
      const toolResultMessages: AIMessage[] = results.map((result, index) => ({
        id: crypto.randomUUID(),
        role: 'tool' as const,
        content: JSON.stringify(result.success ? result.result : { error: result.error }),
        createdAt: new Date(),
        toolCallId: toolCalls[index].id,
        toolName: toolCalls[index].name, // Include tool name for Gemini compatibility
        // Gemini 3: Include thought signature for function responses
        thoughtSignature: toolCalls[index].thoughtSignature,
      }));

      const messagesWithToolResults = [...updatedMessages, ...toolResultMessages];

      // Create placeholder for the AI's interpretation response
      const interpretationMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        createdAt: new Date(),
      };

      setMessages([...messagesWithToolResults, interpretationMessage]);

      try {
        console.log('[AI Chat] Sending tool results to AI for interpretation...');
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: messagesWithToolResults,
            context,
            provider,
            apiKey,
            model,
            enableTools, // Keep tools enabled to allow chained tool calls
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'API request failed');
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter((line) => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }

                if (parsed.type === 'text' && parsed.content) {
                  fullContent += parsed.content;

                  // Update the interpretation message with accumulated content
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    if (updated[lastIdx]?.role === 'assistant') {
                      updated[lastIdx] = {
                        ...updated[lastIdx],
                        content: fullContent,
                      };
                    }
                    return updated;
                  });

                  onMessageUpdate?.(fullContent);
                } else if (parsed.type === 'tool_calls' && parsed.toolCalls) {
                  // Handle chained tool calls
                  console.log('[AI Chat] Received chained tool calls:', parsed.toolCalls.length);
                  setPendingToolCalls(parsed.toolCalls);
                  await onToolCalls?.(parsed.toolCalls);
                }
              } catch (e) {
                if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
                  throw e;
                }
              }
            }
          }
        }

        onComplete?.(fullContent);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        onError?.(errorMessage);

        // On error, keep the tool result messages but remove the empty interpretation
        setMessages(messagesWithToolResults);
      } finally {
        setIsLoading(false);
        setPendingToolCalls(null);
      }
    },
    [messages, provider, getActiveApiKey, getActiveModel, onMessageUpdate, onComplete, onError, enableTools]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setPendingToolCalls(null);
  }, []);

  const clearPendingToolCalls = useCallback(() => {
    setPendingToolCalls(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    pendingToolCalls,
    sendMessage,
    sendToolResults,
    setMessages,
    clearMessages,
    clearPendingToolCalls,
  };
}

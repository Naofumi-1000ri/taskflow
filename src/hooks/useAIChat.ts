'use client';

import React, { useState, useCallback } from 'react';
import { AIContext, AIMessage } from '@/types/ai';
import { useAISettingsStore } from '@/stores/aiSettingsStore';
import { ToolCall } from '@/lib/ai/tools/types';

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
                  onToolCalls?.(parsed.toolCalls);
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
    setMessages,
    clearMessages,
    clearPendingToolCalls,
  };
}

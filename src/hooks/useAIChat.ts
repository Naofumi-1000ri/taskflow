'use client';

import React, { useState, useCallback } from 'react';
import { AIContext, AIMessage } from '@/types/ai';
import { useAISettingsStore } from '@/stores/aiSettingsStore';
import { ToolCall, ToolResult } from '@/lib/ai/tools/types';
import { getAuthHeaders } from '@/lib/firebase/authToken';

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

  const { provider, getActiveModel, isConfigured } = useAISettingsStore();

  const sendMessage = useCallback(
    async (content: string, context: AIContext) => {
      const model = getActiveModel();

      if (!isConfigured()) {
        const errorMsg = 'APIキーが設定されていません。設定画面からAPIキーを設定してください。';
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      setIsLoading(true);
      setError(null);

      const userMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        createdAt: new Date(),
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);

      const assistantMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        createdAt: new Date(),
      };

      setMessages([...newMessages, assistantMessage]);

      try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            messages: newMessages,
            context,
            provider,
            model,
            enableTools,
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
                  setPendingToolCalls(parsed.toolCalls);
                  await onToolCalls?.(parsed.toolCalls);
                } else if (parsed.content) {
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

        setMessages(newMessages);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, provider, getActiveModel, isConfigured, onMessageUpdate, onComplete, onError, onToolCalls, enableTools]
  );

  const sendToolResults = useCallback(
    async (toolCalls: ToolCall[], results: ToolResult[], context: AIContext) => {
      const model = getActiveModel();

      if (!isConfigured()) {
        const errorMsg = 'APIキーが設定されていません。';
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      setIsLoading(true);
      setError(null);

      const updatedMessages = [...messages];
      const lastIndex = updatedMessages.length - 1;

      if (updatedMessages[lastIndex]?.role === 'assistant') {
        updatedMessages[lastIndex] = {
          ...updatedMessages[lastIndex],
          toolCalls: toolCalls.map((tc) => ({
            id: tc.id,
            name: tc.name,
            arguments: tc.arguments,
            thoughtSignature: tc.thoughtSignature,
          })),
        };
      }

      const toolResultMessages: AIMessage[] = results.map((result, index) => ({
        id: crypto.randomUUID(),
        role: 'tool' as const,
        content: JSON.stringify(result.success ? result.result : { error: result.error }),
        createdAt: new Date(),
        toolCallId: toolCalls[index].id,
        toolName: toolCalls[index].name,
        thoughtSignature: toolCalls[index].thoughtSignature,
      }));

      const messagesWithToolResults = [...updatedMessages, ...toolResultMessages];

      const interpretationMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        createdAt: new Date(),
      };

      setMessages([...messagesWithToolResults, interpretationMessage]);

      try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            messages: messagesWithToolResults,
            context,
            provider,
            model,
            enableTools,
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

        setMessages(messagesWithToolResults);
      } finally {
        setIsLoading(false);
        setPendingToolCalls(null);
      }
    },
    [messages, provider, getActiveModel, isConfigured, onMessageUpdate, onComplete, onError, enableTools]
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

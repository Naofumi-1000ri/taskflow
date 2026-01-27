'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AIContext, AIMessage } from '@/types/ai';
import { useAISettingsStore } from '@/stores/aiSettingsStore';
import { ToolCall, ToolResult } from '@/lib/ai/tools/types';
import { executeTools, requiresConfirmation } from '@/lib/ai/toolExecutor';
import {
  createConversation,
  addMessage as saveMessage,
  getMessages,
  generateTitleFromMessage,
  updateConversationTitle,
} from '@/lib/ai/conversationStorage';

interface UseConversationOptions {
  projectId: string | null;
  userId: string;
  context: AIContext;
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
  onToolConfirmRequired?: (toolCalls: ToolCall[]) => void;
}

interface UseConversationReturn {
  messages: AIMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  confirmToolExecution: (toolCalls: ToolCall[]) => Promise<void>;
  cancelToolExecution: () => void;
  loadConversation: (conversationId: string) => Promise<void>;
  clearMessages: () => void;
}

const MAX_TOOL_CHAIN_DEPTH = 5; // Prevent infinite loops

export function useConversation({
  projectId,
  userId,
  context,
  conversationId,
  onConversationCreated,
  onToolConfirmRequired,
}: UseConversationOptions): UseConversationReturn {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId);

  const toolChainDepthRef = useRef(0);
  const pendingToolCallsRef = useRef<ToolCall[] | null>(null);

  const { provider, getActiveApiKey, getActiveModel } = useAISettingsStore();

  // Sync conversationId from props
  useEffect(() => {
    setCurrentConversationId(conversationId);
    if (!conversationId) {
      setMessages([]);
    }
  }, [conversationId]);

  // Load conversation when ID changes
  useEffect(() => {
    if (conversationId && projectId) {
      loadConversation(conversationId);
    }
  }, [conversationId, projectId]);

  const loadConversation = useCallback(async (convId: string) => {
    if (!projectId) return;

    try {
      const loadedMessages = await getMessages(projectId, convId);
      setMessages(loadedMessages);
    } catch (err) {
      console.error('[Conversation] Failed to load messages:', err);
    }
  }, [projectId]);

  /**
   * Save a message to Firestore
   */
  const persistMessage = useCallback(async (
    convId: string,
    message: Omit<AIMessage, 'id' | 'createdAt'>
  ): Promise<string | null> => {
    if (!projectId) return null;

    try {
      return await saveMessage(projectId, convId, message);
    } catch (err) {
      console.error('[Conversation] Failed to save message:', err);
      return null;
    }
  }, [projectId]);

  /**
   * Call the AI API and process the response
   */
  const callAI = useCallback(async (
    messagesToSend: AIMessage[],
    onText: (content: string) => void,
    onToolCalls: (toolCalls: ToolCall[]) => void,
  ): Promise<{ content: string; toolCalls: ToolCall[] | null }> => {
    const apiKey = getActiveApiKey();
    const model = getActiveModel();

    if (!apiKey) {
      throw new Error('APIキーが設定されていません。');
    }

    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messagesToSend,
        context,
        provider,
        apiKey,
        model,
        enableTools: true,
        isPersonalScope: context.scope === 'personal',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'API request failed');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullContent = '';
    let toolCalls: ToolCall[] | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);

            if (parsed.type === 'text' && parsed.content) {
              fullContent += parsed.content;
              onText(fullContent);
            } else if (parsed.type === 'tool_calls' && parsed.toolCalls) {
              toolCalls = parsed.toolCalls;
              onToolCalls(parsed.toolCalls as ToolCall[]);
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              throw e;
            }
          }
        }
      }
    }

    return { content: fullContent, toolCalls };
  }, [context, provider, getActiveApiKey, getActiveModel]);

  /**
   * Process tool calls: execute and send results back to AI
   */
  const processToolCalls = useCallback(async (
    toolCalls: ToolCall[],
    currentMessages: AIMessage[],
    convId: string,
  ): Promise<void> => {
    // Check depth limit
    toolChainDepthRef.current++;
    if (toolChainDepthRef.current > MAX_TOOL_CHAIN_DEPTH) {
      console.warn('[Conversation] Tool chain depth limit reached');
      return;
    }

    console.log('[Conversation] Processing tool calls:', toolCalls.map(t => t.name), 'depth:', toolChainDepthRef.current);

    // Execute tools
    const defaultListId = context.project?.lists[0]?.id;
    const results = await executeTools(toolCalls, {
      scope: 'project',
      projectId: projectId || '',
      userId,
      listId: defaultListId,
    });

    // Update the last assistant message with tool calls
    const updatedMessages = [...currentMessages];
    const lastIndex = updatedMessages.length - 1;
    if (updatedMessages[lastIndex]?.role === 'assistant') {
      updatedMessages[lastIndex] = {
        ...updatedMessages[lastIndex],
        toolCalls: toolCalls.map(tc => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.arguments,
          thoughtSignature: tc.thoughtSignature,
        })),
      };
    }

    // Save assistant message with tool calls
    await persistMessage(convId, {
      role: 'assistant',
      content: updatedMessages[lastIndex]?.content || '',
      toolCalls: updatedMessages[lastIndex]?.toolCalls,
    });

    // Add tool result messages
    const toolResultMessages: AIMessage[] = results.map((result, index) => ({
      id: crypto.randomUUID(),
      role: 'tool' as const,
      content: JSON.stringify(result.success ? result.result : { error: result.error }),
      createdAt: new Date(),
      toolCallId: toolCalls[index].id,
      toolName: toolCalls[index].name,
      thoughtSignature: toolCalls[index].thoughtSignature,
    }));

    // Save tool result messages
    for (const msg of toolResultMessages) {
      await persistMessage(convId, {
        role: msg.role,
        content: msg.content,
        toolCallId: msg.toolCallId,
        toolName: msg.toolName,
        thoughtSignature: msg.thoughtSignature,
      });
    }

    const messagesWithToolResults = [...updatedMessages, ...toolResultMessages];

    // Create placeholder for AI response
    const assistantPlaceholder: AIMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    };

    setMessages([...messagesWithToolResults, assistantPlaceholder]);

    // Call AI with tool results
    const { content, toolCalls: newToolCalls } = await callAI(
      messagesWithToolResults,
      (text) => {
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.role === 'assistant') {
            updated[lastIdx] = { ...updated[lastIdx], content: text };
          }
          return updated;
        });
      },
      (tc) => console.log('[Conversation] Received chained tool calls:', tc.length)
    );

    // Update final messages
    const finalMessages = [...messagesWithToolResults];
    finalMessages.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      content,
      createdAt: new Date(),
    });
    setMessages(finalMessages);

    // Handle chained tool calls
    if (newToolCalls && newToolCalls.length > 0) {
      if (requiresConfirmation(newToolCalls)) {
        pendingToolCallsRef.current = newToolCalls;
        onToolConfirmRequired?.(newToolCalls);
      } else {
        await processToolCalls(newToolCalls, finalMessages, convId);
      }
    } else {
      // No more tool calls - save final assistant message
      if (content) {
        await persistMessage(convId, { role: 'assistant', content });
      }
    }
  }, [projectId, userId, context, callAI, persistMessage, onToolConfirmRequired]);

  /**
   * Send a message to the AI
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);
    toolChainDepthRef.current = 0;

    try {
      // Create conversation if needed
      let convId = currentConversationId;
      if (!convId) {
        convId = await createConversation(projectId, userId, {
          contextType: context.task ? 'task' : 'project',
          contextId: context.task?.id || context.project?.id || null,
        });
        setCurrentConversationId(convId);
        onConversationCreated?.(convId);

        // Set title from first message
        const title = generateTitleFromMessage(content);
        await updateConversationTitle(projectId, convId, title);
      }

      // Create user message
      const userMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        createdAt: new Date(),
      };

      // Save user message
      await persistMessage(convId, { role: 'user', content });

      // Create assistant placeholder
      const assistantPlaceholder: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        createdAt: new Date(),
      };

      const newMessages = [...messages, userMessage, assistantPlaceholder];
      setMessages(newMessages);

      // Call AI
      const messagesToSend = [...messages, userMessage];
      const { content: responseContent, toolCalls } = await callAI(
        messagesToSend,
        (text) => {
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (updated[lastIdx]?.role === 'assistant') {
              updated[lastIdx] = { ...updated[lastIdx], content: text };
            }
            return updated;
          });
        },
        (tc) => console.log('[Conversation] Received tool calls:', tc.length)
      );

      // Update messages with response
      const updatedMessages = [...messages, userMessage];
      updatedMessages.push({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseContent,
        createdAt: new Date(),
      });
      setMessages(updatedMessages);

      // Handle tool calls
      if (toolCalls && toolCalls.length > 0) {
        if (requiresConfirmation(toolCalls)) {
          pendingToolCallsRef.current = toolCalls;
          onToolConfirmRequired?.(toolCalls);
        } else {
          await processToolCalls(toolCalls, updatedMessages, convId);
        }
      } else {
        // No tool calls - save assistant message
        if (responseContent) {
          await persistMessage(convId, { role: 'assistant', content: responseContent });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[Conversation] Error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [
    projectId,
    userId,
    context,
    currentConversationId,
    messages,
    callAI,
    processToolCalls,
    persistMessage,
    onConversationCreated,
    onToolConfirmRequired,
  ]);

  /**
   * Confirm and execute pending tool calls
   */
  const confirmToolExecution = useCallback(async (toolCalls: ToolCall[]) => {
    if (!currentConversationId) return;

    setIsLoading(true);
    try {
      await processToolCalls(toolCalls, messages, currentConversationId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      pendingToolCallsRef.current = null;
    }
  }, [currentConversationId, messages, processToolCalls]);

  /**
   * Cancel pending tool execution
   */
  const cancelToolExecution = useCallback(() => {
    pendingToolCallsRef.current = null;
    setMessages(prev => {
      const updated = [...prev];
      const lastIdx = updated.length - 1;
      if (updated[lastIdx]?.role === 'assistant') {
        updated[lastIdx] = {
          ...updated[lastIdx],
          content: updated[lastIdx].content + '\n\n（操作がキャンセルされました）',
        };
      }
      return updated;
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setCurrentConversationId(null);
    toolChainDepthRef.current = 0;
    pendingToolCallsRef.current = null;
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    confirmToolExecution,
    cancelToolExecution,
    loadConversation,
    clearMessages,
  };
}

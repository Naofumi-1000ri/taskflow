'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AIContext, AIMessage } from '@/types/ai';
import { useAISettingsStore } from '@/stores/aiSettingsStore';
import { ToolCall, ToolResult } from '@/lib/ai/tools/types';
import { getPersonalTool, personalToolRegistry } from '@/lib/ai/tools';
import {
  createPersonalConversation,
  addPersonalMessage as saveMessage,
  getPersonalMessages,
  generateTitleFromMessage,
  updatePersonalConversationTitle,
} from '@/lib/ai/conversationStorage';

interface UsePersonalConversationOptions {
  userId: string;
  projectIds: string[];
  context: AIContext;
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
  onToolConfirmRequired?: (toolCalls: ToolCall[]) => void;
}

interface UsePersonalConversationReturn {
  messages: AIMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  confirmToolExecution: (toolCalls: ToolCall[]) => Promise<void>;
  cancelToolExecution: () => void;
  loadConversation: (conversationId: string) => Promise<void>;
  clearMessages: () => void;
}

const MAX_TOOL_CHAIN_DEPTH = 5;

// Execute personal tools
async function executePersonalTools(
  toolCalls: ToolCall[],
  context: { userId: string; projectIds: string[] }
): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  for (const toolCall of toolCalls) {
    const tool = getPersonalTool(toolCall.name);

    if (!tool) {
      results.push({
        toolCallId: toolCall.id,
        success: false,
        error: `Unknown tool: ${toolCall.name}`,
      });
      continue;
    }

    try {
      const result = await tool.handler(toolCall.arguments, {
        scope: 'personal',
        projectId: '',
        projectIds: context.projectIds,
        userId: context.userId,
      });

      results.push({
        toolCallId: toolCall.id,
        success: true,
        result,
      });
    } catch (err) {
      results.push({
        toolCallId: toolCall.id,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return results;
}

// Check if any tool requires confirmation (currently none do for personal tools)
function requiresConfirmation(_toolCalls: ToolCall[]): boolean {
  // Personal tools are all read-only, so no confirmation needed
  return false;
}

export function usePersonalConversation({
  userId,
  projectIds,
  context,
  conversationId,
  onConversationCreated,
  onToolConfirmRequired,
}: UsePersonalConversationOptions): UsePersonalConversationReturn {
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
    if (conversationId && userId) {
      loadConversation(conversationId);
    }
  }, [conversationId, userId]);

  const loadConversation = useCallback(async (convId: string) => {
    if (!userId) return;

    try {
      const loadedMessages = await getPersonalMessages(userId, convId);
      setMessages(loadedMessages);
    } catch (err) {
      console.error('[PersonalConversation] Failed to load messages:', err);
    }
  }, [userId]);

  /**
   * Save a message to Firestore
   */
  const persistMessage = useCallback(async (
    convId: string,
    message: Omit<AIMessage, 'id' | 'createdAt'>
  ): Promise<string | null> => {
    if (!userId) return null;

    try {
      return await saveMessage(userId, convId, message);
    } catch (err) {
      console.error('[PersonalConversation] Failed to save message:', err);
      return null;
    }
  }, [userId]);

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
        isPersonalScope: true, // Use personal tools
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
      console.warn('[PersonalConversation] Tool chain depth limit reached');
      return;
    }

    console.log('[PersonalConversation] Processing tool calls:', toolCalls.map(t => t.name), 'depth:', toolChainDepthRef.current);

    // Execute tools
    const results = await executePersonalTools(toolCalls, {
      userId,
      projectIds,
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
      (tc) => console.log('[PersonalConversation] Received chained tool calls:', tc.length)
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
  }, [userId, projectIds, callAI, persistMessage, onToolConfirmRequired]);

  /**
   * Send a message to the AI
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);
    toolChainDepthRef.current = 0;

    try {
      // Create conversation if needed
      let convId = currentConversationId;
      if (!convId) {
        convId = await createPersonalConversation(userId);
        setCurrentConversationId(convId);
        onConversationCreated?.(convId);

        // Set title from first message
        const title = generateTitleFromMessage(content);
        await updatePersonalConversationTitle(userId, convId, title);
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
        (tc) => console.log('[PersonalConversation] Received tool calls:', tc.length)
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
      console.error('[PersonalConversation] Error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [
    userId,
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

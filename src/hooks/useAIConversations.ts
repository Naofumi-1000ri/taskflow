'use client';

import { useState, useEffect, useCallback } from 'react';
import { AIConversation, AIMessage } from '@/types/ai';
import {
  createConversation,
  updateConversationTitle,
  deleteConversation,
  subscribeToConversations,
  addMessage,
  getMessages,
  subscribeToMessages,
  generateTitleFromMessage,
} from '@/lib/ai/conversationStorage';

interface UseAIConversationsOptions {
  projectId: string | null;
  userId?: string | null;
}

interface UseAIConversationsReturn {
  conversations: AIConversation[];
  isLoading: boolean;
  error: string | null;
  createNewConversation: (options?: {
    contextType?: 'task' | 'project' | null;
    contextId?: string | null;
  }) => Promise<string | null>;
  updateTitle: (conversationId: string, title: string) => Promise<void>;
  deleteConversationById: (conversationId: string) => Promise<void>;
}

export function useAIConversations({
  projectId,
  userId,
}: UseAIConversationsOptions): UseAIConversationsReturn {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to conversations
  useEffect(() => {
    if (!projectId) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToConversations(projectId, (convs) => {
      setConversations(convs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  const createNewConversation = useCallback(
    async (options?: {
      contextType?: 'task' | 'project' | null;
      contextId?: string | null;
    }): Promise<string | null> => {
      console.log('[AI Conversations] createNewConversation called', {
        projectId,
        userId,
        options
      });

      if (!projectId || !userId) {
        console.error('[AI Conversations] Missing projectId or userId', { projectId, userId });
        return null;
      }

      try {
        const conversationId = await createConversation(projectId, userId, options);
        console.log('[AI Conversations] Conversation created:', conversationId);
        return conversationId;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation';
        console.error('[AI Conversations] Error creating conversation:', errorMessage);
        setError(errorMessage);
        return null;
      }
    },
    [projectId, userId]
  );

  const updateTitle = useCallback(
    async (conversationId: string, title: string): Promise<void> => {
      if (!projectId) return;

      try {
        await updateConversationTitle(projectId, conversationId, title);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update title';
        setError(errorMessage);
      }
    },
    [projectId]
  );

  const deleteConversationById = useCallback(
    async (conversationId: string): Promise<void> => {
      if (!projectId) return;

      try {
        await deleteConversation(projectId, conversationId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete conversation';
        setError(errorMessage);
      }
    },
    [projectId]
  );

  return {
    conversations,
    isLoading,
    error,
    createNewConversation,
    updateTitle,
    deleteConversationById,
  };
}

// Hook for managing messages within a conversation
interface UseAIMessagesOptions {
  projectId: string | null;
  conversationId: string | null;
}

interface UseAIMessagesReturn {
  messages: AIMessage[];
  isLoading: boolean;
  error: string | null;
  addUserMessage: (content: string) => Promise<string | null>;
  addAssistantMessage: (content: string) => Promise<string | null>;
  loadMessages: () => Promise<void>;
}

export function useAIMessages({
  projectId,
  conversationId,
}: UseAIMessagesOptions): UseAIMessagesReturn {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to messages when conversation changes
  useEffect(() => {
    if (!projectId || !conversationId) {
      setMessages([]);
      return;
    }

    setIsLoading(true);

    const unsubscribe = subscribeToMessages(projectId, conversationId, (msgs) => {
      setMessages(msgs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, conversationId]);

  const addUserMessage = useCallback(
    async (content: string): Promise<string | null> => {
      if (!projectId || !conversationId) return null;

      try {
        const messageId = await addMessage(projectId, conversationId, {
          role: 'user',
          content,
        });

        // Auto-generate title from first message
        if (messages.length === 0) {
          const title = generateTitleFromMessage(content);
          await updateConversationTitle(projectId, conversationId, title);
        }

        return messageId;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add message';
        setError(errorMessage);
        return null;
      }
    },
    [projectId, conversationId, messages.length]
  );

  const addAssistantMessage = useCallback(
    async (content: string): Promise<string | null> => {
      if (!projectId || !conversationId) return null;

      try {
        const messageId = await addMessage(projectId, conversationId, {
          role: 'assistant',
          content,
        });
        return messageId;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add message';
        setError(errorMessage);
        return null;
      }
    },
    [projectId, conversationId]
  );

  const loadMessages = useCallback(async (): Promise<void> => {
    if (!projectId || !conversationId) return;

    setIsLoading(true);
    try {
      const msgs = await getMessages(projectId, conversationId);
      setMessages(msgs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, conversationId]);

  return {
    messages,
    isLoading,
    error,
    addUserMessage,
    addAssistantMessage,
    loadMessages,
  };
}

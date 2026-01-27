'use client';

import { useState, useEffect, useCallback } from 'react';
import { AIConversation } from '@/types/ai';
import {
  createPersonalConversation,
  updatePersonalConversationTitle,
  deletePersonalConversation,
  subscribeToPersonalConversations,
} from '@/lib/ai/conversationStorage';

interface UsePersonalConversationsOptions {
  userId: string | null;
}

interface UsePersonalConversationsReturn {
  conversations: AIConversation[];
  isLoading: boolean;
  error: string | null;
  createNewConversation: (options?: { title?: string }) => Promise<string | null>;
  updateTitle: (conversationId: string, title: string) => Promise<void>;
  deleteConversationById: (conversationId: string) => Promise<void>;
}

export function usePersonalConversations({
  userId,
}: UsePersonalConversationsOptions): UsePersonalConversationsReturn {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to personal conversations
  useEffect(() => {
    if (!userId) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToPersonalConversations(userId, (convs) => {
      setConversations(convs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const createNewConversation = useCallback(
    async (options?: { title?: string }): Promise<string | null> => {
      if (!userId) {
        return null;
      }

      try {
        const conversationId = await createPersonalConversation(userId, options);
        return conversationId;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation';
        setError(errorMessage);
        return null;
      }
    },
    [userId]
  );

  const updateTitle = useCallback(
    async (conversationId: string, title: string): Promise<void> => {
      if (!userId) return;

      try {
        await updatePersonalConversationTitle(userId, conversationId, title);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update title';
        setError(errorMessage);
      }
    },
    [userId]
  );

  const deleteConversationById = useCallback(
    async (conversationId: string): Promise<void> => {
      if (!userId) return;

      try {
        await deletePersonalConversation(userId, conversationId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete conversation';
        setError(errorMessage);
      }
    },
    [userId]
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

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAISettingsStore } from '@/stores/aiSettingsStore';
import { AIProviderType, PROVIDER_DISPLAY_NAMES, DEFAULT_MODELS } from '@/types/ai';
import { getAuthHeaders } from '@/lib/firebase/authToken';
import { useAuthStore } from '@/stores/authStore';

interface UseAISettingsReturn {
  provider: AIProviderType;
  isConfigured: boolean;
  isSaving: boolean;
  model: string;
  providers: Array<{ value: AIProviderType; label: string }>;
  defaultModels: Record<AIProviderType, string>;
  setProvider: (provider: AIProviderType) => void;
  saveApiKey: (apiKey: string) => Promise<void>;
  setModel: (model: string) => void;
  refreshKeyStatus: () => Promise<void>;
}

export function useAISettings(): UseAISettingsReturn {
  const store = useAISettingsStore();
  const { isAuthenticated } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);

  const providers = Object.entries(PROVIDER_DISPLAY_NAMES).map(([value, label]) => ({
    value: value as AIProviderType,
    label,
  }));

  // Refresh key status from server on mount
  const refreshKeyStatus = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/ai/keys', { headers });

      if (response.ok) {
        const data = await response.json();
        if (data.openai !== undefined) store.setKeyConfigured('openai', data.openai);
        if (data.anthropic !== undefined) store.setKeyConfigured('anthropic', data.anthropic);
        if (data.gemini !== undefined) store.setKeyConfigured('gemini', data.gemini);
      }
    } catch {
      // Silently fail - key status will be stale but functional
    }
  }, [isAuthenticated, store]);

  useEffect(() => {
    refreshKeyStatus();
  }, [refreshKeyStatus]);

  // Save API key to server
  const saveApiKey = useCallback(async (apiKey: string) => {
    setIsSaving(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/ai/keys', {
        method: 'POST',
        headers,
        body: JSON.stringify({ provider: store.provider, apiKey }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'APIキーの保存に失敗しました');
      }

      store.setKeyConfigured(store.provider, apiKey.length > 0);
    } finally {
      setIsSaving(false);
    }
  }, [store]);

  return {
    provider: store.provider,
    isConfigured: store.isConfigured(),
    isSaving,
    model: store.getActiveModel(),
    providers,
    defaultModels: DEFAULT_MODELS,
    setProvider: store.setProvider,
    saveApiKey,
    setModel: (model: string) => store.setModel(store.provider, model),
    refreshKeyStatus,
  };
}

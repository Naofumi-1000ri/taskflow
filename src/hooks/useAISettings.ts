'use client';

import { useAISettingsStore } from '@/stores/aiSettingsStore';
import { AIProviderType, PROVIDER_DISPLAY_NAMES, DEFAULT_MODELS } from '@/types/ai';

interface UseAISettingsReturn {
  provider: AIProviderType;
  apiKey: string;
  model: string;
  isConfigured: boolean;
  providers: Array<{ value: AIProviderType; label: string }>;
  defaultModels: Record<AIProviderType, string>;
  setProvider: (provider: AIProviderType) => void;
  setApiKey: (apiKey: string) => void;
  setModel: (model: string) => void;
}

export function useAISettings(): UseAISettingsReturn {
  const store = useAISettingsStore();

  const providers = Object.entries(PROVIDER_DISPLAY_NAMES).map(([value, label]) => ({
    value: value as AIProviderType,
    label,
  }));

  return {
    provider: store.provider,
    apiKey: store.getActiveApiKey(),
    model: store.getActiveModel(),
    isConfigured: store.isConfigured(),
    providers,
    defaultModels: DEFAULT_MODELS,
    setProvider: store.setProvider,
    setApiKey: (apiKey: string) => store.setApiKey(store.provider, apiKey),
    setModel: (model: string) => store.setModel(store.provider, model),
  };
}

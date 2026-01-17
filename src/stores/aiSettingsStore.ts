import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AIProviderType, DEFAULT_MODELS } from '@/types/ai';

interface AISettingsState {
  // Current provider
  provider: AIProviderType;
  // API Keys (stored in localStorage)
  openaiApiKey: string;
  anthropicApiKey: string;
  geminiApiKey: string;
  // Models
  openaiModel: string;
  anthropicModel: string;
  geminiModel: string;
  // Actions
  setProvider: (provider: AIProviderType) => void;
  setApiKey: (provider: AIProviderType, apiKey: string) => void;
  setModel: (provider: AIProviderType, model: string) => void;
  getActiveApiKey: () => string;
  getActiveModel: () => string;
  isConfigured: () => boolean;
}

export const useAISettingsStore = create<AISettingsState>()(
  persist(
    (set, get) => ({
      provider: 'openai',
      openaiApiKey: '',
      anthropicApiKey: '',
      geminiApiKey: '',
      openaiModel: DEFAULT_MODELS.openai,
      anthropicModel: DEFAULT_MODELS.anthropic,
      geminiModel: DEFAULT_MODELS.gemini,

      setProvider: (provider) => set({ provider }),

      setApiKey: (provider, apiKey) => {
        switch (provider) {
          case 'openai':
            set({ openaiApiKey: apiKey });
            break;
          case 'anthropic':
            set({ anthropicApiKey: apiKey });
            break;
          case 'gemini':
            set({ geminiApiKey: apiKey });
            break;
        }
      },

      setModel: (provider, model) => {
        switch (provider) {
          case 'openai':
            set({ openaiModel: model });
            break;
          case 'anthropic':
            set({ anthropicModel: model });
            break;
          case 'gemini':
            set({ geminiModel: model });
            break;
        }
      },

      getActiveApiKey: () => {
        const state = get();
        switch (state.provider) {
          case 'openai':
            return state.openaiApiKey;
          case 'anthropic':
            return state.anthropicApiKey;
          case 'gemini':
            return state.geminiApiKey;
        }
      },

      getActiveModel: () => {
        const state = get();
        switch (state.provider) {
          case 'openai':
            return state.openaiModel;
          case 'anthropic':
            return state.anthropicModel;
          case 'gemini':
            return state.geminiModel;
        }
      },

      isConfigured: () => {
        const apiKey = get().getActiveApiKey();
        return apiKey.length > 0;
      },
    }),
    {
      name: 'ai-settings-storage',
      partialize: (state) => ({
        provider: state.provider,
        openaiApiKey: state.openaiApiKey,
        anthropicApiKey: state.anthropicApiKey,
        geminiApiKey: state.geminiApiKey,
        openaiModel: state.openaiModel,
        anthropicModel: state.anthropicModel,
        geminiModel: state.geminiModel,
      }),
    }
  )
);

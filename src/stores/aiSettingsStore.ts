import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AIProviderType, DEFAULT_MODELS } from '@/types/ai';

interface AISettingsState {
  // Current provider
  provider: AIProviderType;
  // Key status (whether keys are configured server-side)
  openaiKeyConfigured: boolean;
  anthropicKeyConfigured: boolean;
  geminiKeyConfigured: boolean;
  // Models
  openaiModel: string;
  anthropicModel: string;
  geminiModel: string;
  // Actions
  setProvider: (provider: AIProviderType) => void;
  setKeyConfigured: (provider: AIProviderType, configured: boolean) => void;
  setModel: (provider: AIProviderType, model: string) => void;
  getActiveModel: () => string;
  isConfigured: () => boolean;
}

export const useAISettingsStore = create<AISettingsState>()(
  persist(
    (set, get) => ({
      provider: 'openai',
      openaiKeyConfigured: false,
      anthropicKeyConfigured: false,
      geminiKeyConfigured: false,
      openaiModel: DEFAULT_MODELS.openai,
      anthropicModel: DEFAULT_MODELS.anthropic,
      geminiModel: DEFAULT_MODELS.gemini,

      setProvider: (provider) => set({ provider }),

      setKeyConfigured: (provider, configured) => {
        switch (provider) {
          case 'openai':
            set({ openaiKeyConfigured: configured });
            break;
          case 'anthropic':
            set({ anthropicKeyConfigured: configured });
            break;
          case 'gemini':
            set({ geminiKeyConfigured: configured });
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
        const state = get();
        switch (state.provider) {
          case 'openai':
            return state.openaiKeyConfigured;
          case 'anthropic':
            return state.anthropicKeyConfigured;
          case 'gemini':
            return state.geminiKeyConfigured;
        }
      },
    }),
    {
      name: 'ai-settings-storage',
      partialize: (state) => ({
        provider: state.provider,
        openaiKeyConfigured: state.openaiKeyConfigured,
        anthropicKeyConfigured: state.anthropicKeyConfigured,
        geminiKeyConfigured: state.geminiKeyConfigured,
        openaiModel: state.openaiModel,
        anthropicModel: state.anthropicModel,
        geminiModel: state.geminiModel,
      }),
    }
  )
);

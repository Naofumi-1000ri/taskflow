import { AIProviderType } from '@/types/ai';
import { AIProvider } from './types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';

// Provider instances (singleton pattern)
const providers: Record<AIProviderType, AIProvider> = {
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  gemini: new GeminiProvider(),
};

/**
 * Get AI provider instance by type
 * @param type - Provider type
 * @returns AI Provider instance
 */
export function getProvider(type: AIProviderType): AIProvider {
  const provider = providers[type];
  if (!provider) {
    throw new Error(`Unknown provider type: ${type}`);
  }
  return provider;
}

/**
 * Check if a provider type is valid
 * @param type - Provider type to check
 * @returns boolean
 */
export function isValidProvider(type: string): type is AIProviderType {
  return type === 'openai' || type === 'anthropic' || type === 'gemini';
}

export type { AIProvider } from './types';

// AI Provider types
export type AIProviderType = 'openai' | 'anthropic' | 'gemini';

export interface AIProviderConfig {
  type: AIProviderType;
  apiKey: string;
  model?: string;
}

// Message types
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}

// Conversation types
export interface AIConversation {
  id: string;
  projectId: string;
  title: string;
  contextType: 'task' | 'project' | null;
  contextId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Context types for AI
export interface AITaskContext {
  id: string;
  title: string;
  description: string;
  priority: string | null;
  dueDate: Date | null;
  status: string; // List name
  assignees: string[];
  comments: Array<{
    content: string;
    authorName: string;
    createdAt: Date;
  }>;
  checklists: Array<{
    title: string;
    items: Array<{
      text: string;
      isChecked: boolean;
    }>;
  }>;
}

export interface AIProjectContext {
  id: string;
  name: string;
  description: string;
  lists: Array<{
    id: string;
    name: string;
    taskCount: number;
  }>;
  members: Array<{
    id: string;
    displayName: string;
  }>;
}

export interface AIContext {
  task?: AITaskContext;
  project: AIProjectContext;
  user: {
    id: string;
    displayName: string;
  };
}

// Chat request/response types
export interface AIChatRequest {
  projectId: string;
  conversationId?: string;
  message: string;
  context: AIContext;
  provider: AIProviderType;
}

export interface AIChatResponse {
  conversationId: string;
  messageId: string;
  content: string;
}

// Settings types
export interface AISettings {
  provider: AIProviderType;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  geminiApiKey?: string;
  openaiModel?: string;
  anthropicModel?: string;
  geminiModel?: string;
}

// Default models
export const DEFAULT_MODELS: Record<AIProviderType, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
  gemini: 'gemini-2.0-flash',
};

// Provider display names
export const PROVIDER_DISPLAY_NAMES: Record<AIProviderType, string> = {
  openai: 'OpenAI (GPT-4)',
  anthropic: 'Anthropic (Claude)',
  gemini: 'Google (Gemini)',
};

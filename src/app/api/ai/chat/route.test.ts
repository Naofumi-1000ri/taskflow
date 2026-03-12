import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

vi.mock('@/lib/ai/providers', () => ({
  getProvider: vi.fn(),
  isValidProvider: vi.fn(() => true),
}));

vi.mock('@/lib/firebase/admin', () => ({
  verifyAuthToken: vi.fn(),
  getUserAIApiKey: vi.fn(),
  getUserAIProjectAccessSettings: vi.fn(),
}));

import { getProvider } from '@/lib/ai/providers';
import {
  getUserAIApiKey,
  getUserAIProjectAccessSettings,
  verifyAuthToken,
} from '@/lib/firebase/admin';

const mockedGetProvider = vi.mocked(getProvider);
const mockedVerifyAuthToken = vi.mocked(verifyAuthToken);
const mockedGetUserAIApiKey = vi.mocked(getUserAIApiKey);
const mockedGetUserAIProjectAccessSettings = vi.mocked(getUserAIProjectAccessSettings);

describe('POST /api/ai/chat', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedVerifyAuthToken.mockResolvedValue({ uid: 'user-1' });
    mockedGetUserAIApiKey.mockResolvedValue('sk-test');
    mockedGetUserAIProjectAccessSettings.mockResolvedValue({
      allowedProjectIds: ['project-1'],
    });
  });

  it('returns forbidden when the current project is outside the allowed set', async () => {
    const request = new NextRequest('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer firebase-id-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [],
        context: {
          scope: 'companion',
          user: { id: 'user-1', displayName: 'User One' },
          projects: [],
        },
        provider: 'openai',
        projectId: 'project-2',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'このプロジェクトではAIアクセスが無効です。AI設定を確認してください。',
    });
    expect(mockedGetProvider).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

vi.mock('@/lib/firebase/admin', () => ({
  verifyAuthToken: vi.fn(),
}));

vi.mock('@/lib/auth/apiTokens', () => ({
  createApiToken: vi.fn(),
  listApiTokens: vi.fn(),
}));

vi.mock('@/lib/auth/apiTokenErrors', () => ({
  getApiTokenRouteError: vi.fn(() => ({ message: 'Internal server error', status: 500 })),
}));

import { verifyAuthToken } from '@/lib/firebase/admin';
import { createApiToken, listApiTokens } from '@/lib/auth/apiTokens';

const mockedVerifyAuthToken = vi.mocked(verifyAuthToken);
const mockedCreateApiToken = vi.mocked(createApiToken);
const mockedListApiTokens = vi.mocked(listApiTokens);

describe('/api/auth/tokens', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedVerifyAuthToken.mockResolvedValue({ uid: 'user-1' });
  });

  it('creates a token with actor metadata', async () => {
    mockedCreateApiToken.mockResolvedValue({
      apiKey: {
        id: 'token-1',
        userId: 'user-1',
        name: 'Claude Desktop',
        actorDisplayName: 'Codex',
        actorIcon: '🤖',
        keyPrefix: 'tf_example...',
        keyHash: 'hash',
        permissions: ['tasks:read'],
        projectIds: null,
        createdAt: new Date('2026-03-13T00:00:00.000Z'),
        lastUsedAt: null,
        expiresAt: null,
        isActive: true,
      },
      plainTextKey: 'tf_example_plain_text',
    });

    const request = new NextRequest('http://localhost/api/auth/tokens', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer firebase-id-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Claude Desktop',
        actorDisplayName: 'Codex',
        actorIcon: '🤖',
        permissions: ['tasks:read'],
        projectIds: null,
        expiresAt: null,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockedCreateApiToken).toHaveBeenCalledWith('user-1', {
      name: 'Claude Desktop',
      actorDisplayName: 'Codex',
      actorIcon: '🤖',
      permissions: ['tasks:read'],
      projectIds: null,
      expiresAt: null,
    });
    await expect(response.json()).resolves.toEqual({
      apiKey: {
        id: 'token-1',
        userId: 'user-1',
        name: 'Claude Desktop',
        actorDisplayName: 'Codex',
        actorIcon: '🤖',
        keyPrefix: 'tf_example...',
        keyHash: '',
        permissions: ['tasks:read'],
        projectIds: null,
        createdAt: '2026-03-13T00:00:00.000Z',
        lastUsedAt: null,
        expiresAt: null,
        isActive: true,
      },
      plainTextKey: 'tf_example_plain_text',
    });
  });

  it('lists token actor metadata', async () => {
    mockedListApiTokens.mockResolvedValue([
      {
        id: 'token-1',
        userId: 'user-1',
        name: 'Claude Desktop',
        actorDisplayName: 'Codex',
        actorIcon: '🤖',
        keyPrefix: 'tf_example...',
        keyHash: 'hash',
        permissions: ['tasks:read'],
        projectIds: ['project-1'],
        createdAt: new Date('2026-03-13T00:00:00.000Z'),
        lastUsedAt: null,
        expiresAt: null,
        isActive: true,
      },
    ]);

    const request = new NextRequest('http://localhost/api/auth/tokens', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer firebase-id-token',
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      apiKeys: [
        {
          id: 'token-1',
          userId: 'user-1',
          name: 'Claude Desktop',
          actorDisplayName: 'Codex',
          actorIcon: '🤖',
          keyPrefix: 'tf_example...',
          keyHash: '',
          permissions: ['tasks:read'],
          projectIds: ['project-1'],
          createdAt: '2026-03-13T00:00:00.000Z',
          lastUsedAt: null,
          expiresAt: null,
          isActive: true,
        },
      ],
    });
  });
});

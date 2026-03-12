import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from './route';

vi.mock('@/lib/firebase/admin', () => ({
  verifyAuthToken: vi.fn(),
  getUserAIProjectAccessSettings: vi.fn(),
  saveUserAIProjectAccessSettings: vi.fn(),
}));

import {
  getUserAIProjectAccessSettings,
  saveUserAIProjectAccessSettings,
  verifyAuthToken,
} from '@/lib/firebase/admin';

const mockedVerifyAuthToken = vi.mocked(verifyAuthToken);
const mockedGetUserAIProjectAccessSettings = vi.mocked(getUserAIProjectAccessSettings);
const mockedSaveUserAIProjectAccessSettings = vi.mocked(saveUserAIProjectAccessSettings);

describe('/api/ai/settings', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedVerifyAuthToken.mockResolvedValue({ uid: 'user-1' });
  });

  it('returns allowed project ids', async () => {
    mockedGetUserAIProjectAccessSettings.mockResolvedValue({
      allowedProjectIds: ['project-1', 'project-2'],
    });

    const request = new NextRequest('http://localhost/api/ai/settings', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer firebase-id-token',
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockedVerifyAuthToken).toHaveBeenCalledWith('Bearer firebase-id-token');
    await expect(response.json()).resolves.toEqual({
      allowedProjectIds: ['project-1', 'project-2'],
    });
  });

  it('saves an unrestricted configuration as null', async () => {
    const request = new NextRequest('http://localhost/api/ai/settings', {
      method: 'PATCH',
      body: JSON.stringify({ allowedProjectIds: null }),
      headers: {
        Authorization: 'Bearer firebase-id-token',
        'Content-Type': 'application/json',
      },
    });

    const response = await PATCH(request);

    expect(response.status).toBe(200);
    expect(mockedSaveUserAIProjectAccessSettings).toHaveBeenCalledWith('user-1', null);
    await expect(response.json()).resolves.toEqual({ allowedProjectIds: null });
  });

  it('rejects invalid payloads', async () => {
    const request = new NextRequest('http://localhost/api/ai/settings', {
      method: 'PATCH',
      body: JSON.stringify({ allowedProjectIds: 'project-1' }),
      headers: {
        Authorization: 'Bearer firebase-id-token',
        'Content-Type': 'application/json',
      },
    });

    const response = await PATCH(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'allowedProjectIds must be an array or null',
    });
    expect(mockedSaveUserAIProjectAccessSettings).not.toHaveBeenCalled();
  });
});

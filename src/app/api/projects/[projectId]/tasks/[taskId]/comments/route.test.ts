import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

vi.mock('@/lib/auth/authenticateRequest', () => ({
  authenticateRequest: vi.fn(),
}));

vi.mock('@/lib/auth/projectAccess', () => ({
  getProjectAccess: vi.fn(),
}));

vi.mock('@/lib/firebase/admin-projects', () => ({
  createProjectTaskComment: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  getUserProfileSummary: vi.fn(),
}));

import { authenticateRequest } from '@/lib/auth/authenticateRequest';
import { getProjectAccess } from '@/lib/auth/projectAccess';
import { createProjectTaskComment } from '@/lib/firebase/admin-projects';
import { getUserProfileSummary } from '@/lib/firebase/admin';

const mockedAuthenticateRequest = vi.mocked(authenticateRequest);
const mockedGetProjectAccess = vi.mocked(getProjectAccess);
const mockedCreateProjectTaskComment = vi.mocked(createProjectTaskComment);
const mockedGetUserProfileSummary = vi.mocked(getUserProfileSummary);

describe('POST /api/projects/[projectId]/tasks/[taskId]/comments', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedAuthenticateRequest.mockResolvedValue({
      userId: 'user-1',
      authType: 'api-token',
      tokenName: 'Claude Desktop',
      actorDisplayName: 'Codex',
      actorIcon: '🤖',
      permissions: ['tasks:write'],
      projectIds: null,
      tokenId: 'token-1',
    });
    mockedGetProjectAccess.mockResolvedValue({ role: 'editor' });
    mockedGetUserProfileSummary.mockResolvedValue({
      displayName: 'Naofumi',
      photoURL: null,
    });
  });

  it('creates a task comment', async () => {
    mockedCreateProjectTaskComment.mockResolvedValue({
      comment: {
        id: 'comment-1',
        taskId: 'task-1',
        content: 'AI progress update',
        authorId: 'user-1',
        authorLabel: 'Naofumi via Codex',
        authorIcon: '🤖',
        mentions: [],
        attachments: [],
        createdAt: '2026-03-13T00:00:00.000Z',
        updatedAt: '2026-03-13T00:00:00.000Z',
      },
    });

    const request = new NextRequest('http://localhost/api/projects/project-1/tasks/task-1/comments', {
      method: 'POST',
      body: JSON.stringify({ content: '  AI progress update  ' }),
      headers: {
        Authorization: 'Bearer tf_example',
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request, {
      params: Promise.resolve({ projectId: 'project-1', taskId: 'task-1' }),
    });

    expect(response.status).toBe(201);
    expect(mockedAuthenticateRequest).toHaveBeenCalledWith('Bearer tf_example');
    expect(mockedGetProjectAccess).toHaveBeenCalledWith('user-1', 'project-1', ['tasks:write'], null, 'tasks:write');
    expect(mockedCreateProjectTaskComment).toHaveBeenCalledWith('project-1', 'task-1', 'user-1', {
      content: 'AI progress update',
      authorLabel: 'Naofumi via Codex',
      authorIcon: '🤖',
      mentions: undefined,
    });
    await expect(response.json()).resolves.toEqual({
      comment: {
        id: 'comment-1',
        taskId: 'task-1',
        content: 'AI progress update',
        authorId: 'user-1',
        authorLabel: 'Naofumi via Codex',
        authorIcon: '🤖',
        mentions: [],
        attachments: [],
        createdAt: '2026-03-13T00:00:00.000Z',
        updatedAt: '2026-03-13T00:00:00.000Z',
      },
    });
  });

  it('rejects empty content', async () => {
    const request = new NextRequest('http://localhost/api/projects/project-1/tasks/task-1/comments', {
      method: 'POST',
      body: JSON.stringify({ content: '   ' }),
      headers: {
        Authorization: 'Bearer tf_example',
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request, {
      params: Promise.resolve({ projectId: 'project-1', taskId: 'task-1' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'CONTENT_REQUIRED' });
    expect(mockedCreateProjectTaskComment).not.toHaveBeenCalled();
  });

  it('maps viewer access failures to forbidden', async () => {
    mockedGetProjectAccess.mockRejectedValue(new Error('FORBIDDEN'));

    const request = new NextRequest('http://localhost/api/projects/project-1/tasks/task-1/comments', {
      method: 'POST',
      body: JSON.stringify({ content: 'Viewer comment attempt' }),
      headers: {
        Authorization: 'Bearer tf_example',
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request, {
      params: Promise.resolve({ projectId: 'project-1', taskId: 'task-1' }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
  });
});

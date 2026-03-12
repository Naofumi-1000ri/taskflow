import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/authenticateRequest';
import { getProjectAccess } from '@/lib/auth/projectAccess';
import { createProjectTaskComment } from '@/lib/firebase/admin-projects';

interface RouteContext {
  params: Promise<{
    projectId: string;
    taskId: string;
  }>;
}

function parseStringArray(value: unknown, fieldName: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`INVALID_${fieldName.toUpperCase()}`);
  }

  return value;
}

function parseCreateCommentBody(body: unknown): { content: string; mentions?: string[] } {
  if (typeof body !== 'object' || body === null) {
    throw new Error('INVALID_BODY');
  }

  const payload = body as Record<string, unknown>;

  if (typeof payload.content !== 'string' || !payload.content.trim()) {
    throw new Error('CONTENT_REQUIRED');
  }

  if (payload.attachments !== undefined) {
    throw new Error('ATTACHMENTS_NOT_SUPPORTED');
  }

  return {
    content: payload.content.trim(),
    mentions: parseStringArray(payload.mentions, 'mentions'),
  };
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateRequest(request.headers.get('Authorization'));
    const { projectId, taskId } = await context.params;

    await getProjectAccess(
      auth.userId,
      projectId,
      auth.permissions,
      auth.projectIds,
      'tasks:write'
    );

    const body = await request.json();
    const commentInput = parseCreateCommentBody(body);
    const result = await createProjectTaskComment(projectId, taskId, auth.userId, commentInput);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';

    if (message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (
      message === 'INVALID_BODY' ||
      message === 'CONTENT_REQUIRED' ||
      message === 'ATTACHMENTS_NOT_SUPPORTED' ||
      message.startsWith('INVALID_')
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const status = message.includes('Authorization') || message === 'Invalid API token' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/authenticateRequest';
import { getProjectAccess } from '@/lib/auth/projectAccess';
import { restoreProjectTask } from '@/lib/firebase/admin-projects';

interface RouteContext {
  params: Promise<{
    projectId: string;
    taskId: string;
  }>;
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

    const result = await restoreProjectTask(projectId, taskId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';

    if (message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (message === 'NOT_ARCHIVED') {
      return NextResponse.json({ error: 'Task is not archived' }, { status: 409 });
    }

    const status = message.includes('Authorization') || message === 'Invalid API token' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

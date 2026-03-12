import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/authenticateRequest';
import { getProjectAccess } from '@/lib/auth/projectAccess';
import { listProjectLists } from '@/lib/firebase/admin-projects';

interface RouteContext {
  params: Promise<{
    projectId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateRequest(request.headers.get('Authorization'));
    const { projectId } = await context.params;

    await getProjectAccess(
      auth.userId,
      projectId,
      auth.permissions,
      auth.projectIds,
      'projects:read'
    );

    const lists = await listProjectLists(projectId);
    return NextResponse.json({ lists });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';

    if (message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const status = message.includes('Authorization') || message === 'Invalid API token' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

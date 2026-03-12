import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/authenticateRequest';
import { listUserProjects } from '@/lib/firebase/admin-projects';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request.headers.get('Authorization'));

    if (auth.authType === 'api-token' && auth.permissions !== null) {
      const canReadProjects =
        auth.permissions.includes('admin') ||
        auth.permissions.includes('projects:read') ||
        auth.permissions.includes('projects:write');

      if (!canReadProjects) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const projects = await listUserProjects(auth.userId, auth.projectIds);
    return NextResponse.json({ projects });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Authorization') || message === 'Invalid API token' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

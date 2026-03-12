import { NextRequest, NextResponse } from 'next/server';
import {
  getUserAIProjectAccessSettings,
  saveUserAIProjectAccessSettings,
  verifyAuthToken,
} from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request.headers.get('Authorization'));
    const settings = await getUserAIProjectAccessSettings(user.uid);

    return NextResponse.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request.headers.get('Authorization'));
    const body = await request.json();
    const rawAllowedProjectIds = body?.allowedProjectIds;

    if (
      rawAllowedProjectIds !== null &&
      rawAllowedProjectIds !== undefined &&
      !Array.isArray(rawAllowedProjectIds)
    ) {
      return NextResponse.json(
        { error: 'allowedProjectIds must be an array or null' },
        { status: 400 }
      );
    }

    const allowedProjectIds = Array.isArray(rawAllowedProjectIds)
      ? rawAllowedProjectIds.filter(
          (projectId): projectId is string =>
            typeof projectId === 'string' && projectId.length > 0
        )
      : null;

    await saveUserAIProjectAccessSettings(user.uid, allowedProjectIds);

    return NextResponse.json({ allowedProjectIds });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Authorization') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

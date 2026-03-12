import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/firebase/admin';
import { deactivateApiToken, deleteApiToken } from '@/lib/auth/apiTokens';

interface RouteContext {
  params: Promise<{
    tokenId: string;
  }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await verifyAuthToken(request.headers.get('Authorization'));
    const { tokenId } = await context.params;
    await deactivateApiToken(user.uid, tokenId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';

    if (message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'API token not found' }, { status: 404 });
    }

    const status = message.includes('Authorization') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await verifyAuthToken(request.headers.get('Authorization'));
    const { tokenId } = await context.params;
    await deleteApiToken(user.uid, tokenId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';

    if (message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'API token not found' }, { status: 404 });
    }

    const status = message.includes('Authorization') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

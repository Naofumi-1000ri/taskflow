import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/firebase/admin';
import { createApiToken, listApiTokens } from '@/lib/auth/apiTokens';
import { getApiTokenRouteError } from '@/lib/auth/apiTokenErrors';
import type { ApiKey, ApiKeyCreateData, ApiKeyPermission } from '@/types/apiKey';

function isApiKeyPermission(value: string): value is ApiKeyPermission {
  return [
    'tasks:read',
    'tasks:write',
    'projects:read',
    'projects:write',
    'members:manage',
    'admin',
  ].includes(value);
}

function sanitizeApiKey(apiKey: ApiKey): ApiKey {
  return {
    ...apiKey,
    keyHash: '',
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request.headers.get('Authorization'));
    const apiKeys = await listApiTokens(user.uid);
    return NextResponse.json({ apiKeys: apiKeys.map(sanitizeApiKey) });
  } catch (error) {
    const { message, status } = getApiTokenRouteError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request.headers.get('Authorization'));
    const body = (await request.json()) as Partial<ApiKeyCreateData>;

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const permissions = Array.isArray(body.permissions)
      ? body.permissions.filter((permission): permission is ApiKeyPermission => typeof permission === 'string' && isApiKeyPermission(permission))
      : [];

    if (permissions.length === 0) {
      return NextResponse.json({ error: 'At least one permission is required' }, { status: 400 });
    }

    const projectIds = Array.isArray(body.projectIds)
      ? body.projectIds.filter((projectId): projectId is string => typeof projectId === 'string' && projectId.length > 0)
      : null;

    let expiresAt: Date | null = null;
    if (typeof body.expiresAt === 'string') {
      const parsedDate = new Date(body.expiresAt);
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: 'Invalid expiresAt' }, { status: 400 });
      }
      expiresAt = parsedDate;
    }

    const { apiKey, plainTextKey } = await createApiToken(user.uid, {
      name,
      permissions,
      projectIds,
      expiresAt,
    });

    return NextResponse.json({ apiKey: sanitizeApiKey(apiKey), plainTextKey }, { status: 201 });
  } catch (error) {
    const { message, status } = getApiTokenRouteError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

import type { ApiKeyPermission } from '@/types/apiKey';
import { validateApiToken } from '@/lib/auth/apiTokens';
import { verifyAuthToken } from '@/lib/firebase/admin';

export interface AuthenticatedRequest {
  userId: string;
  authType: 'firebase' | 'api-token';
  tokenName: string | null;
  actorDisplayName: string | null;
  actorIcon: string | null;
  permissions: ApiKeyPermission[] | null;
  projectIds: string[] | null;
  tokenId: string | null;
}

export async function authenticateRequest(authHeader: string | null): Promise<AuthenticatedRequest> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const bearerToken = authHeader.slice(7);

  if (bearerToken.startsWith('tf_')) {
    const apiToken = await validateApiToken(bearerToken);
    if (!apiToken) {
      throw new Error('Invalid API token');
    }

    return {
      userId: apiToken.userId,
      authType: 'api-token',
      tokenName: apiToken.name,
      actorDisplayName: apiToken.actorDisplayName,
      actorIcon: apiToken.actorIcon,
      permissions: apiToken.permissions,
      projectIds: apiToken.projectIds,
      tokenId: apiToken.id,
    };
  }

  const firebaseUser = await verifyAuthToken(authHeader);
  return {
    userId: firebaseUser.uid,
    authType: 'firebase',
    tokenName: null,
    actorDisplayName: null,
    actorIcon: null,
    permissions: null,
    projectIds: null,
    tokenId: null,
  };
}

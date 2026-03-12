import type { ApiKeyPermission } from '@/types/apiKey';
import { validateApiToken } from '@/lib/auth/apiTokens';
import { verifyAuthToken } from '@/lib/firebase/admin';

export interface AuthenticatedRequest {
  userId: string;
  authType: 'firebase' | 'api-token';
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
      permissions: apiToken.permissions,
      projectIds: apiToken.projectIds,
      tokenId: apiToken.id,
    };
  }

  const firebaseUser = await verifyAuthToken(authHeader);
  return {
    userId: firebaseUser.uid,
    authType: 'firebase',
    permissions: null,
    projectIds: null,
    tokenId: null,
  };
}

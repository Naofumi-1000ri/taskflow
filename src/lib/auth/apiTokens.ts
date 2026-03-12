import { randomBytes, createHash } from 'crypto';
import { getAdminDb } from '@/lib/firebase/admin';
import type { ApiKey, ApiKeyCreateData, ApiKeyPermission } from '@/types/apiKey';

interface ApiTokenDoc {
  name: string;
  keyPrefix: string;
  keyHash: string;
  permissions: ApiKeyPermission[];
  projectIds: string[] | null;
  createdAt?: { toDate?: () => Date };
  lastUsedAt?: { toDate?: () => Date } | null;
  expiresAt?: { toDate?: () => Date } | null;
  isActive: boolean;
}

export interface AuthenticatedApiToken {
  id: string;
  userId: string;
  permissions: ApiKeyPermission[];
  projectIds: string[] | null;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateApiToken(): string {
  return `tf_${randomBytes(24).toString('base64url')}`;
}

function toDate(value: { toDate?: () => Date } | null | undefined): Date | null {
  if (!value?.toDate) {
    return null;
  }
  return value.toDate();
}

function mapApiKey(
  userId: string,
  id: string,
  data: ApiTokenDoc
): ApiKey {
  return {
    id,
    userId,
    name: data.name,
    keyPrefix: data.keyPrefix,
    keyHash: data.keyHash,
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    projectIds: Array.isArray(data.projectIds) ? data.projectIds : null,
    createdAt: toDate(data.createdAt) ?? new Date(),
    lastUsedAt: toDate(data.lastUsedAt),
    expiresAt: toDate(data.expiresAt),
    isActive: data.isActive === true,
  };
}

export async function createApiToken(
  userId: string,
  data: ApiKeyCreateData
): Promise<{ apiKey: ApiKey; plainTextKey: string }> {
  const db = getAdminDb();
  const plainTextKey = generateApiToken();
  const keyHash = hashToken(plainTextKey);
  const keyPrefix = `${plainTextKey.slice(0, 12)}...`;

  const docRef = await db
    .collection('users')
    .doc(userId)
    .collection('apiTokens')
    .add({
      name: data.name,
      keyPrefix,
      keyHash,
      permissions: data.permissions,
      projectIds: data.projectIds,
      createdAt: new Date(),
      lastUsedAt: null,
      expiresAt: data.expiresAt,
      isActive: true,
    });

  return {
    apiKey: {
      id: docRef.id,
      userId,
      name: data.name,
      keyPrefix,
      keyHash,
      permissions: data.permissions,
      projectIds: data.projectIds,
      createdAt: new Date(),
      lastUsedAt: null,
      expiresAt: data.expiresAt,
      isActive: true,
    },
    plainTextKey,
  };
}

export async function listApiTokens(userId: string): Promise<ApiKey[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('apiTokens')
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => mapApiKey(userId, doc.id, doc.data() as ApiTokenDoc));
}

export async function deactivateApiToken(userId: string, tokenId: string): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection('users').doc(userId).collection('apiTokens').doc(tokenId);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new Error('NOT_FOUND');
  }

  await ref.update({
    isActive: false,
  });
}

export async function deleteApiToken(userId: string, tokenId: string): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection('users').doc(userId).collection('apiTokens').doc(tokenId);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new Error('NOT_FOUND');
  }

  await ref.delete();
}

export async function validateApiToken(token: string): Promise<AuthenticatedApiToken | null> {
  if (!token.startsWith('tf_')) {
    return null;
  }

  const db = getAdminDb();
  const keyHash = hashToken(token);
  const snapshot = await db
    .collectionGroup('apiTokens')
    .where('keyHash', '==', keyHash)
    .where('isActive', '==', true)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const tokenDoc = snapshot.docs[0];
  const data = tokenDoc.data() as ApiTokenDoc;
  const expiresAt = toDate(data.expiresAt);
  if (expiresAt && expiresAt < new Date()) {
    return null;
  }

  await tokenDoc.ref.update({
    lastUsedAt: new Date(),
  });

  const parentUserRef = tokenDoc.ref.parent.parent;
  if (!parentUserRef) {
    return null;
  }

  return {
    id: tokenDoc.id,
    userId: parentUserRef.id,
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    projectIds: Array.isArray(data.projectIds) ? data.projectIds : null,
  };
}

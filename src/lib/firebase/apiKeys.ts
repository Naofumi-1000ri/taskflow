import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { getFirebaseDb } from './config';
import type { ApiKey, ApiKeyCreateData, ApiKeyPermission } from '@/types/apiKey';
import { generateApiKey } from '@/types/apiKey';

// Hash a key using SHA-256
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Create a new API key
export async function createApiKey(
  userId: string,
  data: ApiKeyCreateData
): Promise<{ apiKey: ApiKey; plainTextKey: string }> {
  const db = getFirebaseDb();
  const plainTextKey = generateApiKey();
  const keyHash = await hashKey(plainTextKey);
  const keyPrefix = plainTextKey.substring(0, 11) + '...'; // "tf_abc1234..."

  const docRef = await addDoc(collection(db, 'apiKeys'), {
    name: data.name,
    actorDisplayName: data.actorDisplayName,
    actorIcon: data.actorIcon,
    keyPrefix,
    keyHash,
    userId,
    permissions: data.permissions,
    projectIds: data.projectIds,
    createdAt: serverTimestamp(),
    lastUsedAt: null,
    expiresAt: data.expiresAt,
    isActive: true,
  });

  const apiKey: ApiKey = {
    id: docRef.id,
    name: data.name,
    actorDisplayName: data.actorDisplayName,
    actorIcon: data.actorIcon,
    keyPrefix,
    keyHash,
    userId,
    permissions: data.permissions,
    projectIds: data.projectIds,
    createdAt: new Date(),
    lastUsedAt: null,
    expiresAt: data.expiresAt,
    isActive: true,
  };

  return { apiKey, plainTextKey };
}

// Get all API keys for a user
export async function getUserApiKeys(userId: string): Promise<ApiKey[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, 'apiKeys'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      actorDisplayName: data.actorDisplayName || null,
      actorIcon: data.actorIcon || null,
      keyPrefix: data.keyPrefix,
      keyHash: data.keyHash,
      userId: data.userId,
      permissions: data.permissions as ApiKeyPermission[],
      projectIds: data.projectIds,
      createdAt: data.createdAt?.toDate() || new Date(),
      lastUsedAt: data.lastUsedAt?.toDate() || null,
      expiresAt: data.expiresAt?.toDate() || null,
      isActive: data.isActive,
    };
  });
}

// Validate an API key and return the key data if valid
export async function validateApiKey(plainTextKey: string): Promise<ApiKey | null> {
  if (!plainTextKey.startsWith('tf_')) {
    return null;
  }

  const db = getFirebaseDb();
  const keyHash = await hashKey(plainTextKey);

  const q = query(
    collection(db, 'apiKeys'),
    where('keyHash', '==', keyHash),
    where('isActive', '==', true)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  // Check expiration
  if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
    return null;
  }

  // Update last used timestamp
  await updateDoc(doc.ref, {
    lastUsedAt: serverTimestamp(),
  });

  return {
    id: doc.id,
    name: data.name,
    actorDisplayName: data.actorDisplayName || null,
    actorIcon: data.actorIcon || null,
    keyPrefix: data.keyPrefix,
    keyHash: data.keyHash,
    userId: data.userId,
    permissions: data.permissions as ApiKeyPermission[],
    projectIds: data.projectIds,
    createdAt: data.createdAt?.toDate() || new Date(),
    lastUsedAt: new Date(),
    expiresAt: data.expiresAt?.toDate() || null,
    isActive: data.isActive,
  };
}

// Deactivate an API key
export async function deactivateApiKey(keyId: string, userId: string): Promise<void> {
  const db = getFirebaseDb();
  const keyRef = doc(db, 'apiKeys', keyId);
  const keyDoc = await getDoc(keyRef);

  if (!keyDoc.exists()) {
    throw new Error('API key not found');
  }

  if (keyDoc.data().userId !== userId) {
    throw new Error('Unauthorized');
  }

  await updateDoc(keyRef, {
    isActive: false,
  });
}

// Delete an API key permanently
export async function deleteApiKey(keyId: string, userId: string): Promise<void> {
  const db = getFirebaseDb();
  const keyRef = doc(db, 'apiKeys', keyId);
  const keyDoc = await getDoc(keyRef);

  if (!keyDoc.exists()) {
    throw new Error('API key not found');
  }

  if (keyDoc.data().userId !== userId) {
    throw new Error('Unauthorized');
  }

  await deleteDoc(keyRef);
}

// Update API key permissions
export async function updateApiKeyPermissions(
  keyId: string,
  userId: string,
  permissions: ApiKeyPermission[],
  projectIds: string[] | null
): Promise<void> {
  const db = getFirebaseDb();
  const keyRef = doc(db, 'apiKeys', keyId);
  const keyDoc = await getDoc(keyRef);

  if (!keyDoc.exists()) {
    throw new Error('API key not found');
  }

  if (keyDoc.data().userId !== userId) {
    throw new Error('Unauthorized');
  }

  await updateDoc(keyRef, {
    permissions,
    projectIds,
  });
}

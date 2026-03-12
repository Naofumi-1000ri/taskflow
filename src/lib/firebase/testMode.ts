'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import type { User as AppUser } from '@/types';

function isLocalhostBrowser(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

export function isFirebaseTestAuthEnabled(): boolean {
  return isLocalhostBrowser() && process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH === 'true';
}

export function isE2EMockAuthEnabled(): boolean {
  return isLocalhostBrowser() && process.env.NEXT_PUBLIC_E2E_MOCK_AUTH === 'true';
}

export function getMockAppUser(): AppUser {
  const now = new Date();
  return {
    id: 'e2e-mock-user',
    displayName: 'E2E Mock User',
    email: 'e2e.mock@example.com',
    photoURL: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function getMockFirebaseUser(): FirebaseUser {
  return {
    uid: 'e2e-mock-user',
    displayName: 'E2E Mock User',
    email: 'e2e.mock@example.com',
    photoURL: null,
  } as FirebaseUser;
}

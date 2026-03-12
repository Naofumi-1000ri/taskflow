'use client';

import { useEffect, type ReactNode } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { useAuthStore } from '@/stores/authStore';
import { subscribeToAuthState, getUserData } from '@/lib/firebase/auth';
import { getMockAppUser, getMockFirebaseUser, isE2EMockAuthEnabled } from '@/lib/firebase/testMode';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setFirebaseUser, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    if (isE2EMockAuthEnabled()) {
      queueMicrotask(() => {
        setFirebaseUser(getMockFirebaseUser() as FirebaseUser);
        setUser(getMockAppUser());
        setLoading(false);
      });
      return () => undefined;
    }

    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        try {
          const userData = await getUserData(firebaseUser.uid);
          setUser(userData);
        } catch (error) {
          console.error('[Auth] Error fetching user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [setFirebaseUser, setUser, setLoading]);

  return <>{children}</>;
}

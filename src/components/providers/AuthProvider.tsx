'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { subscribeToAuthState, getUserData } from '@/lib/firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/config';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setFirebaseUser, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Check current user immediately
    const auth = getFirebaseAuth();
    console.log('[Auth] Current user on mount:', auth.currentUser?.email || 'null');

    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      console.log('[Auth] Auth state changed:', firebaseUser?.email || 'null');
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        console.log('[Auth] Fetching user data from Firestore...');
        try {
          const userData = await getUserData(firebaseUser.uid);
          console.log('[Auth] User data from Firestore:', userData);
          setUser(userData);
        } catch (error) {
          console.error('[Auth] Error fetching user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }

      console.log('[Auth] Setting loading to false');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setFirebaseUser, setUser, setLoading]);

  return <>{children}</>;
}

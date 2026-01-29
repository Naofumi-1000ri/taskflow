'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { subscribeToAuthState, getUserData } from '@/lib/firebase/auth';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setFirebaseUser, setUser, setLoading } = useAuthStore();

  useEffect(() => {
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

'use client';

import { useEffect, type ReactNode } from 'react';
import { AuthProvider } from './AuthProvider';
import { QueryProvider } from './QueryProvider';
import { initializeFirestore } from '@/lib/firebase/config';
import { isE2EMockAuthEnabled } from '@/lib/firebase/testMode';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Initialize Firestore on mount
  useEffect(() => {
    if (isE2EMockAuthEnabled()) {
      return;
    }
    initializeFirestore().catch(console.error);
  }, []);

  return (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  );
}

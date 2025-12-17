'use client';

import { useEffect, type ReactNode } from 'react';
import { AuthProvider } from './AuthProvider';
import { QueryProvider } from './QueryProvider';
import { initializeFirestore } from '@/lib/firebase/config';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Initialize Firestore on mount
  useEffect(() => {
    initializeFirestore().catch(console.error);
  }, []);

  return (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  );
}

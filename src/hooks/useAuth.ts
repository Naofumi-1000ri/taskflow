'use client';

import { useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  signInWithGoogle,
  signInWithTestUser,
  signOut as firebaseSignOut,
  isTestMode,
  getUserData,
} from '@/lib/firebase/auth';

export function useAuth() {
  const {
    firebaseUser,
    user,
    isLoading,
    isAuthenticated,
    setFirebaseUser,
    setUser,
    setLoading,
    reset,
  } = useAuthStore();

  // Sign in with Google
  const signIn = useCallback(async () => {
    try {
      setLoading(true);
      const fbUser = await signInWithGoogle();
      // Explicitly set the user in store (don't wait for onAuthStateChanged)
      setFirebaseUser(fbUser);
      const userData = await getUserData(fbUser.uid);
      setUser(userData);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setFirebaseUser, setUser]);

  // Sign in with test user (E2E testing)
  const signInAsTestUser = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[useAuth] Starting test sign in...');
      const fbUser = await signInWithTestUser();
      console.log('[useAuth] Firebase auth completed:', fbUser.email);
      // Explicitly set the user in store (don't wait for onAuthStateChanged)
      setFirebaseUser(fbUser);
      console.log('[useAuth] setFirebaseUser called');
      const userData = await getUserData(fbUser.uid);
      console.log('[useAuth] getUserData completed:', userData?.email);
      setUser(userData);
      console.log('[useAuth] signInAsTestUser completed');
    } catch (error) {
      console.error('Test sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setFirebaseUser, setUser]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      await firebaseSignOut();
      reset();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, reset]);

  return {
    user,
    firebaseUser,
    isLoading,
    isAuthenticated,
    isTestMode: isTestMode(),
    signIn,
    signInAsTestUser,
    signOut,
  };
}

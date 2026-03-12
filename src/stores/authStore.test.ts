import { describe, it, expect, beforeEach } from 'vitest';
import type { User as FirebaseUser } from 'firebase/auth';
import { useAuthStore } from './authStore';
import type { User as AppUser } from '@/types';

const mockAppUser: AppUser = {
  id: 'user-1',
  displayName: 'Test User',
  email: 'test@example.com',
  photoURL: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('authStore', () => {
  const mockFirebaseUser = { uid: 'fb-1' } as FirebaseUser;

  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it('should have correct initial state', () => {
    const state = useAuthStore.getState();
    expect(state.firebaseUser).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(true);
    expect(state.isAuthenticated).toBe(false);
  });

  describe('setFirebaseUser', () => {
    it('should set firebase user and mark as authenticated', () => {
      useAuthStore.getState().setFirebaseUser(mockFirebaseUser);
      const state = useAuthStore.getState();
      expect(state.firebaseUser).toBe(mockFirebaseUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should set isAuthenticated to false when user is null', () => {
      useAuthStore.getState().setFirebaseUser(mockFirebaseUser);
      useAuthStore.getState().setFirebaseUser(null);
      const state = useAuthStore.getState();
      expect(state.firebaseUser).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should set app user data', () => {
      useAuthStore.getState().setUser(mockAppUser);
      expect(useAuthStore.getState().user).toEqual(mockAppUser);
    });

    it('should clear user data when set to null', () => {
      useAuthStore.getState().setUser(mockAppUser);
      useAuthStore.getState().setUser(null);
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      useAuthStore.getState().setFirebaseUser(mockFirebaseUser);
      useAuthStore.getState().setUser(mockAppUser);
      useAuthStore.getState().setLoading(false);

      useAuthStore.getState().reset();
      const state = useAuthStore.getState();
      expect(state.firebaseUser).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(true);
      expect(state.isAuthenticated).toBe(false);
    });
  });
});

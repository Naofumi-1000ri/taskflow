import { create } from 'zustand';
import type { User } from 'firebase/auth';
import type { User as AppUser } from '@/types';

interface AuthState {
  // Firebase user
  firebaseUser: User | null;
  // App user data from Firestore
  user: AppUser | null;
  // Loading state
  isLoading: boolean;
  // Is authenticated
  isAuthenticated: boolean;
  // Actions
  setFirebaseUser: (user: User | null) => void;
  setUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  firebaseUser: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  setFirebaseUser: (firebaseUser) =>
    set({
      firebaseUser,
      isAuthenticated: !!firebaseUser,
    }),

  setUser: (user) => set({ user }),

  setLoading: (isLoading) => set({ isLoading }),

  reset: () => set(initialState),
}));

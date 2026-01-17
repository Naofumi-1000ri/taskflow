import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './config';
import type { User as AppUser } from '@/types';

const googleProvider = new GoogleAuthProvider();

// Restrict to 1000ri.jp domain
googleProvider.setCustomParameters({
  hd: '1000ri.jp',
});

// Allowed email domain
const ALLOWED_DOMAIN = '1000ri.jp';

// Test user credentials (only for E2E testing)
export const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
  displayName: 'テストユーザー',
} as const;

// Check if test mode is enabled (only on localhost)
export function isTestMode(): boolean {
  if (typeof window === 'undefined') return false;
  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
  return isLocalhost && process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH === 'true';
}

// Check if running on mobile device
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Sign in with Google OAuth (popup method)
 * Only allows users with 1000ri.jp domain email
 */
export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  const result = await signInWithPopup(auth, googleProvider);

  // Verify email domain
  const email = result.user.email;
  if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    // Sign out the unauthorized user
    await firebaseSignOut(auth);
    throw new Error(`このアプリは ${ALLOWED_DOMAIN} ドメインのユーザーのみ利用可能です。`);
  }

  // Create or update user document in Firestore
  await createOrUpdateUser(result.user);

  return result.user;
}

/**
 * Sign in with test user (E2E testing only, localhost only)
 */
export async function signInWithTestUser(): Promise<User> {
  if (!isTestMode()) {
    throw new Error('Test authentication is only available on localhost');
  }

  const auth = getFirebaseAuth();

  try {
    // Try to sign in with existing test user
    const result = await signInWithEmailAndPassword(
      auth,
      TEST_USER.email,
      TEST_USER.password
    );
    await createOrUpdateUser(result.user);
    return result.user;
  } catch (error: unknown) {
    // If user doesn't exist, create it
    // Note: Firebase now returns 'auth/invalid-credential' instead of 'auth/user-not-found'
    // for security reasons (to prevent user enumeration attacks)
    const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : null;
    if (errorCode === 'auth/user-not-found' || errorCode === 'auth/invalid-credential') {
      try {
        const result = await createUserWithEmailAndPassword(
          auth,
          TEST_USER.email,
          TEST_USER.password
        );
        await createOrUpdateUser(result.user);
        return result.user;
      } catch (createError: unknown) {
        // If user already exists with different password, or other error
        console.error('Failed to create test user:', createError);
        throw createError;
      }
    }
    throw error;
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  await firebaseSignOut(auth);
}

/**
 * Subscribe to auth state changes
 */
export function subscribeToAuthState(
  callback: (user: User | null) => void
): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

/**
 * Get the current authenticated user
 */
export function getCurrentUser(): User | null {
  const auth = getFirebaseAuth();
  return auth.currentUser;
}

/**
 * Create or update user document in Firestore
 */
async function createOrUpdateUser(firebaseUser: User): Promise<void> {
  const db = getFirebaseDb();
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    // Create new user document
    const newUser: Omit<AppUser, 'id'> = {
      displayName: firebaseUser.displayName || 'Unknown User',
      email: firebaseUser.email || '',
      photoURL: firebaseUser.photoURL,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(userRef, {
      ...newUser,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    // Update existing user (last login)
    await setDoc(
      userRef,
      {
        displayName: firebaseUser.displayName || userDoc.data().displayName,
        email: firebaseUser.email || userDoc.data().email,
        photoURL: firebaseUser.photoURL,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

/**
 * Get user data from Firestore
 */
export async function getUserData(userId: string): Promise<AppUser | null> {
  const db = getFirebaseDb();
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    return null;
  }

  const data = userDoc.data();
  return {
    id: userDoc.id,
    displayName: data.displayName,
    email: data.email,
    photoURL: data.photoURL,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

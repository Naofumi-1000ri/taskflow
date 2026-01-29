import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence, type Auth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (singleton pattern)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let authInitialized = false;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const apps = getApps();
    app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    // Set persistence to local storage
    if (!authInitialized && typeof window !== 'undefined') {
      authInitialized = true;
      setPersistence(auth, browserLocalPersistence).catch(console.error);
    }
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}

// Initialize Firestore with settings (call once on app start)
let firestoreInitialized = false;
export async function initializeFirestore(): Promise<void> {
  if (firestoreInitialized) return;
  firestoreInitialized = true;

  // Enable offline persistence
  if (typeof window !== 'undefined') {
    try {
      await enableIndexedDbPersistence(getFirebaseDb());
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code !== 'failed-precondition' && error.code !== 'unimplemented') {
        console.error('[Firestore] Persistence error:', err);
      }
    }
  }
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp());
  }
  return storage;
}

export { app, auth, db, storage };

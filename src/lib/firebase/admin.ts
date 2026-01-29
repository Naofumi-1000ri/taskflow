import { initializeApp, getApps, cert, applicationDefault, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let adminApp: App;
let adminAuth: Auth;
let adminDb: Firestore;

function getAdminApp(): App {
  if (!adminApp) {
    const apps = getApps();
    if (apps.length > 0) {
      adminApp = apps[0];
    } else {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      if (serviceAccountKey) {
        // Use service account key from environment variable (JSON string)
        const serviceAccount = JSON.parse(serviceAccountKey);
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      } else {
        // Fall back to application default credentials
        // Works in Google Cloud environments or with GOOGLE_APPLICATION_CREDENTIALS env var
        adminApp = initializeApp({
          credential: applicationDefault(),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      }
    }
  }
  return adminApp;
}

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(getAdminApp());
  }
  return adminAuth;
}

export function getAdminDb(): Firestore {
  if (!adminDb) {
    adminDb = getFirestore(getAdminApp());
  }
  return adminDb;
}

/**
 * Verify Firebase ID token and return the decoded token
 */
export async function verifyAuthToken(authHeader: string | null): Promise<{ uid: string; email?: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const idToken = authHeader.slice(7);
  const decodedToken = await getAdminAuth().verifyIdToken(idToken);
  return { uid: decodedToken.uid, email: decodedToken.email };
}

/**
 * Get AI API key for a user from Firestore
 */
export async function getUserAIApiKey(
  userId: string,
  provider: string
): Promise<string | null> {
  const db = getAdminDb();
  const settingsDoc = await db.collection('users').doc(userId).collection('settings').doc('aiKeys').get();

  if (!settingsDoc.exists) {
    return null;
  }

  const data = settingsDoc.data();
  return data?.[`${provider}ApiKey`] || null;
}

/**
 * Save AI API key for a user to Firestore
 */
export async function saveUserAIApiKey(
  userId: string,
  provider: string,
  apiKey: string
): Promise<void> {
  const db = getAdminDb();
  await db.collection('users').doc(userId).collection('settings').doc('aiKeys').set(
    { [`${provider}ApiKey`]: apiKey },
    { merge: true }
  );
}

/**
 * Get all AI settings for a user from Firestore
 */
export async function getUserAISettings(userId: string): Promise<Record<string, string> | null> {
  const db = getAdminDb();
  const settingsDoc = await db.collection('users').doc(userId).collection('settings').doc('aiKeys').get();

  if (!settingsDoc.exists) {
    return null;
  }

  return settingsDoc.data() as Record<string, string>;
}

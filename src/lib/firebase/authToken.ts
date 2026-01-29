import { getFirebaseAuth } from './config';

/**
 * Get the current user's Firebase ID token for API authentication.
 * This token is sent as a Bearer token in the Authorization header.
 */
export async function getAuthToken(): Promise<string> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('ログインしていません。再ログインしてください。');
  }

  return user.getIdToken();
}

/**
 * Create authorization headers with the Firebase ID token.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

const FIREBASE_ADMIN_CREDENTIAL_PATTERNS = [
  'Could not load the default credentials',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'FIREBASE_SERVICE_ACCOUNT_KEY',
  'Service account object must contain',
  'Failed to parse private key',
  'private_key',
  'client_email',
  'project_id',
];

const AUTHORIZATION_ERROR_PATTERNS = [
  'Missing or invalid Authorization header',
  'Not authenticated',
  'auth/id-token-expired',
  'auth/id-token-revoked',
  'Firebase ID token has expired',
  'Decoding Firebase ID token failed',
  'argument-error',
];

function includesKnownPattern(message: string, patterns: string[]): boolean {
  return patterns.some((pattern) => message.includes(pattern));
}

function normalizeMessage(message: string | null | undefined): string {
  return typeof message === 'string' ? message.trim() : '';
}

export function isFirebaseAdminCredentialError(message: string): boolean {
  return includesKnownPattern(message, FIREBASE_ADMIN_CREDENTIAL_PATTERNS);
}

export function isApiTokenAuthorizationError(message: string): boolean {
  return includesKnownPattern(message, AUTHORIZATION_ERROR_PATTERNS);
}

export function formatApiTokenErrorMessage(
  message: string | null | undefined,
  fallback: string
): string {
  const normalized = normalizeMessage(message);

  if (!normalized || normalized === 'Internal Server Error' || normalized === 'Internal server error') {
    return fallback;
  }

  if (isApiTokenAuthorizationError(normalized)) {
    return '認証の有効期限を確認できませんでした。ページを再読み込みして、もう一度お試しください。';
  }

  if (isFirebaseAdminCredentialError(normalized)) {
    return 'サーバー側の Firebase Admin 認証情報が未設定または無効です。FIREBASE_SERVICE_ACCOUNT_KEY または GOOGLE_APPLICATION_CREDENTIALS を設定してください。';
  }

  return normalized;
}

export function getApiTokenRouteError(error: unknown): { message: string; status: number } {
  const rawMessage = error instanceof Error ? error.message : 'Internal server error';

  if (isApiTokenAuthorizationError(rawMessage)) {
    return {
      status: 401,
      message: 'Authentication failed. Refresh your session and try again.',
    };
  }

  if (isFirebaseAdminCredentialError(rawMessage)) {
    return {
      status: 500,
      message: 'Firebase Admin credentials are not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS.',
    };
  }

  return {
    status: 500,
    message: normalizeMessage(rawMessage) || 'Internal server error',
  };
}

export async function readApiTokenError(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === 'string') {
      return formatApiTokenErrorMessage(body.error, fallback);
    }
  } catch {
    // Ignore JSON parsing errors and fall back to the HTTP status text.
  }

  return formatApiTokenErrorMessage(response.statusText, fallback);
}

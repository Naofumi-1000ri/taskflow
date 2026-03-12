import { describe, expect, it } from 'vitest';
import {
  formatApiTokenErrorMessage,
  getApiTokenRouteError,
  readApiTokenError,
} from './apiTokenErrors';

describe('apiTokenErrors', () => {
  describe('formatApiTokenErrorMessage', () => {
    it('maps missing Firebase Admin credentials to an actionable message', () => {
      expect(
        formatApiTokenErrorMessage(
          'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.',
          'APIキーの作成に失敗しました。'
        )
      ).toContain('FIREBASE_SERVICE_ACCOUNT_KEY');
    });

    it('maps expired auth to a retryable session message', () => {
      expect(
        formatApiTokenErrorMessage(
          'Firebase ID token has expired. Get a fresh token from your client app and try again.',
          'APIキーの取得に失敗しました。'
        )
      ).toContain('ページを再読み込み');
    });

    it('falls back for generic internal errors', () => {
      expect(
        formatApiTokenErrorMessage('Internal Server Error', 'APIキーの取得に失敗しました。')
      ).toBe('APIキーの取得に失敗しました。');
    });
  });

  describe('getApiTokenRouteError', () => {
    it('returns a 500 with a credential-specific message', () => {
      expect(
        getApiTokenRouteError(
          new Error('Could not load the default credentials. Use GOOGLE_APPLICATION_CREDENTIALS.')
        )
      ).toEqual({
        status: 500,
        message:
          'Firebase Admin credentials are not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS.',
      });
    });

    it('returns a 401 for auth failures', () => {
      expect(
        getApiTokenRouteError(new Error('Missing or invalid Authorization header'))
      ).toEqual({
        status: 401,
        message: 'Authentication failed. Refresh your session and try again.',
      });
    });
  });

  describe('readApiTokenError', () => {
    it('reads and formats the JSON error payload', async () => {
      const response = new Response(
        JSON.stringify({
          error:
            'Firebase Admin credentials are not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      await expect(
        readApiTokenError(response, 'APIキーの作成に失敗しました。')
      ).resolves.toContain('FIREBASE_SERVICE_ACCOUNT_KEY');
    });
  });
});

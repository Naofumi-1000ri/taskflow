import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, saveUserAIApiKey, getUserAISettings } from '@/lib/firebase/admin';
import { isValidProvider } from '@/lib/ai/providers';

/**
 * GET /api/ai/keys - Get saved AI key status (not the actual keys)
 * Returns which providers have keys configured
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request.headers.get('Authorization'));

    const settings = await getUserAISettings(user.uid);
    if (!settings) {
      return NextResponse.json({
        openai: false,
        anthropic: false,
        gemini: false,
      });
    }

    // Return only whether keys exist, not the actual keys
    return NextResponse.json({
      openai: !!settings.openaiApiKey,
      anthropic: !!settings.anthropicApiKey,
      gemini: !!settings.geminiApiKey,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

/**
 * POST /api/ai/keys - Save an AI API key
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request.headers.get('Authorization'));

    const body = await request.json();
    const { provider, apiKey } = body;

    if (!provider || !isValidProvider(provider)) {
      return NextResponse.json(
        { error: 'Valid provider is required (openai, anthropic, or gemini)' },
        { status: 400 }
      );
    }

    if (typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'API key must be a string' },
        { status: 400 }
      );
    }

    await saveUserAIApiKey(user.uid, provider, apiKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Authorization') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextRequest } from 'next/server';
import { getProvider, isValidProvider } from '@/lib/ai/providers';
import { AIContext, AIMessage, AIProviderType } from '@/types/ai';
import { verifyAuthToken, getUserAIApiKey } from '@/lib/firebase/admin';

interface ChatRequest {
  messages: AIMessage[];
  context: AIContext;
  provider: AIProviderType;
  model?: string;
  enableTools?: boolean;
  isToolResultContinuation?: boolean;
  projectId?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    let userId: string;
    try {
      const user = await verifyAuthToken(request.headers.get('Authorization'));
      userId = user.uid;
    } catch {
      return new Response(
        JSON.stringify({ error: '認証が必要です。再ログインしてください。' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = (await request.json()) as ChatRequest;
    const { messages, context, provider, model, enableTools, projectId } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!context) {
      return new Response(
        JSON.stringify({ error: 'Context is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!provider || !isValidProvider(provider)) {
      return new Response(
        JSON.stringify({ error: 'Valid provider is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Retrieve API key from server-side storage
    const apiKey = await getUserAIApiKey(userId, provider);
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'APIキーが設定されていません。設定画面からAPIキーを設定してください。' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get provider and create streaming response
    const aiProvider = getProvider(provider);

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          const generator = aiProvider.sendMessage(
            messages,
            context,
            apiKey,
            model,
            { enableTools, projectId: projectId ?? undefined }
          );

          for await (const chunk of generator) {
            if (chunk.type === 'text') {
              const data = `data: ${JSON.stringify({ type: 'text', content: chunk.content })}\n\n`;
              controller.enqueue(encoder.encode(data));
            } else if (chunk.type === 'tool_calls') {
              const data = `data: ${JSON.stringify({ type: 'tool_calls', toolCalls: chunk.toolCalls })}\n\n`;
              controller.enqueue(encoder.encode(data));
            } else if (chunk.type === 'done') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            }
          }

          controller.close();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          const errorData = `data: ${JSON.stringify({ error: errorMessage })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

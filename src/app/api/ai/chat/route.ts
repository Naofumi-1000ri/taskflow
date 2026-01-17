import { NextRequest } from 'next/server';
import { getProvider, isValidProvider } from '@/lib/ai/providers';
import { AIContext, AIMessage, AIProviderType } from '@/types/ai';

interface ChatRequest {
  messages: AIMessage[];
  context: AIContext;
  provider: AIProviderType;
  apiKey: string;
  model?: string;
  enableTools?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;
    const { messages, context, provider, apiKey, model, enableTools } = body;

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

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key is required' }),
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
          // Debug: send start message
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'debug', message: 'Starting generator' })}\n\n`));

          const generator = aiProvider.sendMessage(
            messages,
            context,
            apiKey,
            model,
            { enableTools }
          );

          let chunkCount = 0;
          for await (const chunk of generator) {
            chunkCount++;
            // Debug: log each chunk type
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'debug', message: `Chunk ${chunkCount}: ${chunk.type}` })}\n\n`));

            // Handle different chunk types
            if (chunk.type === 'text') {
              // Send text content
              const data = `data: ${JSON.stringify({ type: 'text', content: chunk.content })}\n\n`;
              controller.enqueue(encoder.encode(data));
            } else if (chunk.type === 'tool_calls') {
              // Send tool calls for confirmation
              const data = `data: ${JSON.stringify({ type: 'tool_calls', toolCalls: chunk.toolCalls })}\n\n`;
              controller.enqueue(encoder.encode(data));
            } else if (chunk.type === 'done') {
              // Send done event
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'debug', message: `Total chunks: ${chunkCount}` })}\n\n`));
          controller.close();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'debug', message: `Error: ${errorMessage}` })}\n\n`));
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
    console.error('Chat API error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

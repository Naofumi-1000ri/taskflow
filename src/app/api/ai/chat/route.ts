import { NextRequest } from 'next/server';
import { getProvider, isValidProvider } from '@/lib/ai/providers';
import { AIContext, AIMessage, AIProviderType } from '@/types/ai';
import { getAnthropicTools, getOpenAITools, getGeminiTools } from '@/lib/ai/tools';

interface ChatRequest {
  messages: AIMessage[];
  context: AIContext;
  provider: AIProviderType;
  apiKey: string;
  model?: string;
  enableTools?: boolean;
  // When true, this is a continuation after tool execution - AI should interpret results
  isToolResultContinuation?: boolean;
  // When true, use personal scope tools (cross-project)
  isPersonalScope?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;
    const { messages, context, provider, apiKey, model, enableTools, isToolResultContinuation, isPersonalScope } = body;

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

    // Debug: Log available tools when tools are enabled
    if (enableTools) {
      const anthropicTools = getAnthropicTools(isPersonalScope);
      console.log('[AI Chat API] Tools enabled. Provider:', provider, 'Personal scope:', isPersonalScope);
      console.log('[AI Chat API] Available tools:', anthropicTools.map(t => t.name).join(', '));
      console.log('[AI Chat API] Tool count:', anthropicTools.length);
    }

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
            { enableTools, isToolResultContinuation, isPersonalScope }
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

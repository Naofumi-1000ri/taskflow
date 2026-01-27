import { NextResponse } from 'next/server';
import { getAnthropicTools, getOpenAITools, getAllToolDefinitions } from '@/lib/ai/tools';

export async function GET() {
  const allTools = getAllToolDefinitions();
  const anthropicTools = getAnthropicTools();
  const openAITools = getOpenAITools();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    totalTools: allTools.length,
    toolNames: allTools.map(t => t.name),
    anthropicFormat: anthropicTools.map(t => ({ name: t.name, description: t.description.substring(0, 50) })),
    openAIFormat: openAITools.map(t => ({ name: t.function.name })),
  });
}

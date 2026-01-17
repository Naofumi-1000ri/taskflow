'use client';

import { AIMessage } from '@/types/ai';
import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  message: AIMessage;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 p-4',
        isUser ? 'bg-muted/50' : 'bg-background'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="text-xs font-medium text-muted-foreground">
          {isUser ? 'あなた' : 'AI アシスタント'}
        </div>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <MessageContent content={message.content} isStreaming={isStreaming} />
        </div>
      </div>
    </div>
  );
}

interface MessageContentProps {
  content: string;
  isStreaming?: boolean;
}

function MessageContent({ content, isStreaming }: MessageContentProps) {
  if (!content) {
    if (isStreaming) {
      return (
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground animation-delay-100" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground animation-delay-200" />
        </span>
      );
    }
    return null;
  }

  // Simple markdown-like rendering
  const lines = content.split('\n');

  return (
    <div className="whitespace-pre-wrap break-words">
      {lines.map((line, index) => (
        <span key={index}>
          {formatLine(line)}
          {index < lines.length - 1 && <br />}
        </span>
      ))}
      {isStreaming && (
        <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-foreground" />
      )}
    </div>
  );
}

function formatLine(line: string): React.ReactNode {
  // Bold: **text**
  let result: React.ReactNode[] = [];
  const boldRegex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      result.push(line.substring(lastIndex, match.index));
    }
    result.push(
      <strong key={match.index}>{match[1]}</strong>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    result.push(line.substring(lastIndex));
  }

  if (result.length === 0) {
    return line;
  }

  return result;
}

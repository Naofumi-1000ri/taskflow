'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Settings, AlertCircle } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAISettingsStore } from '@/stores/aiSettingsStore';
import { useConversation } from '@/hooks/useConversation';
import { useAIConversations } from '@/hooks/useAIConversations';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { ConversationList } from './ConversationList';
import { ToolConfirmDialog } from './ToolConfirmDialog';
import { AIContext, PROVIDER_DISPLAY_NAMES } from '@/types/ai';
import { ToolCall } from '@/lib/ai/tools/types';
import { useRouter } from 'next/navigation';

interface SupportAIPanelProps {
  projectId: string | null;
  context: AIContext;
}

export function SupportAIPanel({ projectId, context }: SupportAIPanelProps) {
  const router = useRouter();
  const { isAIPanelOpen, closeAIPanel, selectedConversationId, setSelectedConversationId } =
    useUIStore();
  const { provider, isConfigured } = useAISettingsStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showConversations, setShowConversations] = useState(true);
  const [showToolConfirm, setShowToolConfirm] = useState(false);
  const [pendingTools, setPendingTools] = useState<ToolCall[] | null>(null);

  // Conversations list management
  const {
    conversations,
    isLoading: conversationsLoading,
    deleteConversationById,
  } = useAIConversations({ projectId, userId: context.user.id });

  // Conversation state and messaging
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    confirmToolExecution,
    cancelToolExecution,
    clearMessages,
  } = useConversation({
    projectId,
    userId: context.user.id,
    context,
    conversationId: selectedConversationId,
    onConversationCreated: (id) => setSelectedConversationId(id),
    onToolConfirmRequired: (toolCalls) => {
      setPendingTools(toolCalls);
      setShowToolConfirm(true);
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = useCallback(async (content: string) => {
    if (!projectId) return;
    await sendMessage(content);
  }, [projectId, sendMessage]);

  // Handle creating a new conversation
  const handleNewConversation = useCallback(() => {
    setSelectedConversationId(null);
    clearMessages();
  }, [setSelectedConversationId, clearMessages]);

  // Handle selecting a conversation
  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
  }, [setSelectedConversationId]);

  // Handle deleting a conversation
  const handleDeleteConversation = useCallback(async (id: string) => {
    await deleteConversationById(id);
    if (selectedConversationId === id) {
      setSelectedConversationId(null);
      clearMessages();
    }
  }, [deleteConversationById, selectedConversationId, setSelectedConversationId, clearMessages]);

  // Handle tool execution confirmation
  const handleToolConfirm = useCallback(async () => {
    if (!pendingTools) return;

    setShowToolConfirm(false);
    await confirmToolExecution(pendingTools);
    setPendingTools(null);
  }, [pendingTools, confirmToolExecution]);

  // Handle tool cancellation
  const handleToolCancel = useCallback(() => {
    setShowToolConfirm(false);
    setPendingTools(null);
    cancelToolExecution();
  }, [cancelToolExecution]);

  // Navigate to settings page
  const handleGoToSettings = useCallback(() => {
    closeAIPanel();
    router.push('/settings/ai');
  }, [closeAIPanel, router]);

  const isApiConfigured = isConfigured();

  return (
    <Sheet open={isAIPanelOpen} onOpenChange={(open) => !open && closeAIPanel()}>
      <SheetContent side="right" className="flex w-full max-w-2xl flex-col p-0 sm:max-w-2xl">
        <SheetHeader className="flex-row items-center justify-between space-y-0 border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2">
            AI アシスタント
            <span className="text-xs font-normal text-muted-foreground">
              ({PROVIDER_DISPLAY_NAMES[provider]})
            </span>
          </SheetTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConversations(!showConversations)}
              className="text-xs"
            >
              {showConversations ? '履歴を隠す' : '履歴を表示'}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleGoToSettings}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {!isApiConfigured ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="font-medium">APIキーが設定されていません</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                AI機能を使用するには、設定画面でAPIキーを設定してください。
              </p>
            </div>
            <Button onClick={handleGoToSettings}>
              <Settings className="mr-2 h-4 w-4" />
              設定画面へ
            </Button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1">
            {showConversations && (
              <div className="w-48 shrink-0">
                <ConversationList
                  conversations={conversations}
                  selectedId={selectedConversationId}
                  onSelect={handleSelectConversation}
                  onDelete={handleDeleteConversation}
                  onNewConversation={handleNewConversation}
                  isLoading={conversationsLoading}
                />
              </div>
            )}
            <div className="flex min-h-0 flex-1 flex-col">
              {/* Context Preview */}
              {context.task && context.project && (
                <div className="border-b bg-muted/30 px-4 py-2">
                  <div className="text-xs text-muted-foreground">
                    コンテキスト: {context.project.name}
                  </div>
                  <div className="truncate text-sm font-medium">
                    {context.task.title}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                    <div className="mb-4 rounded-full bg-muted p-4">
                      <Settings className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium">AIアシスタント</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      タスクやプロジェクトについて質問してください。
                    </p>
                    <div className="mt-4 grid gap-2 text-sm">
                      <SuggestionChip onClick={() => handleSendMessage('新しいタスクを作成したい')}>
                        新しいタスクを作成したい
                      </SuggestionChip>
                      <SuggestionChip onClick={() => handleSendMessage('このタスクを分解して')}>
                        このタスクを分解して
                      </SuggestionChip>
                      <SuggestionChip onClick={() => handleSendMessage('優先順位の付け方を教えて')}>
                        優先順位の付け方を教えて
                      </SuggestionChip>
                    </div>
                  </div>
                ) : (
                  <div>
                    {messages
                      // Filter out tool messages and empty assistant messages (except streaming)
                      .filter((message, index) => {
                        // Hide tool result messages
                        if (message.role === 'tool') return false;
                        // Hide empty assistant messages unless it's the last one and streaming
                        if (message.role === 'assistant' && !message.content) {
                          const isLastMessage = index === messages.length - 1;
                          return isLastMessage && isLoading;
                        }
                        return true;
                      })
                      .map((message, index, filteredMessages) => (
                        <ChatMessage
                          key={message.id || index}
                          message={message}
                          isStreaming={
                            isLoading &&
                            index === filteredMessages.length - 1 &&
                            message.role === 'assistant'
                          }
                        />
                      ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Error display */}
              {error && (
                <div className="border-t bg-destructive/10 px-4 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Input */}
              <ChatInput
                onSend={handleSendMessage}
                isLoading={isLoading}
                disabled={!projectId}
                placeholder={
                  context.task
                    ? `${context.task.title} について質問...`
                    : 'メッセージを入力...'
                }
              />
            </div>
          </div>
        )}
      </SheetContent>

      {/* Tool Confirmation Dialog */}
      <ToolConfirmDialog
        open={showToolConfirm}
        onOpenChange={setShowToolConfirm}
        toolCalls={pendingTools || []}
        onConfirm={handleToolConfirm}
        onCancel={handleToolCancel}
        isExecuting={isLoading}
      />
    </Sheet>
  );
}

interface SuggestionChipProps {
  children: React.ReactNode;
  onClick: () => void;
}

function SuggestionChip({ children, onClick }: SuggestionChipProps) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border bg-background px-4 py-2 text-sm transition-colors hover:bg-muted"
    >
      {children}
    </button>
  );
}

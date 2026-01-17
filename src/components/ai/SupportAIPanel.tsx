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
import { useAIChat } from '@/hooks/useAIChat';
import { useAIConversations, useAIMessages } from '@/hooks/useAIConversations';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { ConversationList } from './ConversationList';
import { ToolConfirmDialog } from './ToolConfirmDialog';
import { AIContext, PROVIDER_DISPLAY_NAMES } from '@/types/ai';
import { ToolCall } from '@/lib/ai/tools/types';
import { executeTools } from '@/lib/ai/toolExecutor';
import { cn } from '@/lib/utils';
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
  const [isExecutingTools, setIsExecutingTools] = useState(false);

  // Conversations management
  const {
    conversations,
    isLoading: conversationsLoading,
    error: conversationError,
    createNewConversation,
    deleteConversationById,
  } = useAIConversations({ projectId, userId: context.user.id });

  // Messages for current conversation
  const {
    messages: savedMessages,
    addUserMessage,
    addAssistantMessage,
  } = useAIMessages({
    projectId,
    conversationId: selectedConversationId,
  });

  // Chat state and streaming
  const {
    messages: chatMessages,
    isLoading: chatLoading,
    error: chatError,
    sendMessage,
    setMessages,
    clearMessages,
    clearPendingToolCalls,
  } = useAIChat({
    enableTools: true,
    onComplete: async (content) => {
      // Save assistant message when streaming completes
      if (selectedConversationId && content) {
        await addAssistantMessage(content);
      }
    },
    onToolCalls: (toolCalls) => {
      // Show confirmation dialog when tool calls are received
      setPendingTools(toolCalls);
      setShowToolConfirm(true);
    },
  });

  // Sync saved messages to chat state when conversation changes
  // Don't sync while streaming to avoid overwriting the streaming response
  useEffect(() => {
    if (chatLoading) return;

    if (savedMessages.length > 0) {
      setMessages(savedMessages);
    } else if (!selectedConversationId) {
      // Only clear when no conversation is selected (starting fresh)
      clearMessages();
    }
  }, [savedMessages, setMessages, clearMessages, chatLoading, selectedConversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Handle sending a message
  const handleSendMessage = useCallback(
    async (content: string) => {
      console.log('[AI] handleSendMessage called', {
        projectId,
        selectedConversationId,
        userId: context.user.id,
        content: content.substring(0, 50)
      });

      if (!projectId) {
        console.error('[AI] No projectId - aborting');
        return;
      }

      let conversationId = selectedConversationId;

      // Create new conversation if none selected
      if (!conversationId) {
        console.log('[AI] Creating new conversation...');
        conversationId = await createNewConversation({
          contextType: context.task ? 'task' : 'project',
          contextId: context.task?.id || context.project.id,
        });
        console.log('[AI] Conversation created:', conversationId);
        if (conversationId) {
          setSelectedConversationId(conversationId);
        }
      }

      if (!conversationId) {
        console.error('[AI] Failed to create conversation - aborting');
        return;
      }

      // Save user message to Firestore
      console.log('[AI] Saving user message...');
      await addUserMessage(content);

      // Send to AI and stream response
      console.log('[AI] Sending to AI...');
      await sendMessage(content, context);
      console.log('[AI] sendMessage completed');
    },
    [
      projectId,
      selectedConversationId,
      context,
      createNewConversation,
      setSelectedConversationId,
      addUserMessage,
      sendMessage,
    ]
  );

  // Handle creating a new conversation
  const handleNewConversation = useCallback(() => {
    setSelectedConversationId(null);
    clearMessages();
  }, [setSelectedConversationId, clearMessages]);

  // Handle selecting a conversation
  const handleSelectConversation = useCallback(
    (id: string) => {
      setSelectedConversationId(id);
    },
    [setSelectedConversationId]
  );

  // Handle deleting a conversation
  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await deleteConversationById(id);
      if (selectedConversationId === id) {
        setSelectedConversationId(null);
        clearMessages();
      }
    },
    [deleteConversationById, selectedConversationId, setSelectedConversationId, clearMessages]
  );

  // Handle tool execution confirmation
  const handleToolConfirm = useCallback(async () => {
    if (!pendingTools || !projectId || !context.user.id) return;

    setIsExecutingTools(true);

    try {
      // Get the first list ID from the project for task creation
      const defaultListId = context.project.lists[0]?.id;

      const results = await executeTools(pendingTools, {
        projectId,
        userId: context.user.id,
        listId: defaultListId,
      });

      // Update the assistant message with tool execution results
      const successCount = results.filter((r) => r.success).length;
      const totalCount = results.length;

      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (updated[lastIndex]?.role === 'assistant') {
          const currentContent = updated[lastIndex].content;
          const resultMessage =
            successCount === totalCount
              ? `\n\n${totalCount}件のタスクを作成しました。`
              : `\n\n${successCount}/${totalCount}件のタスクを作成しました。`;
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: currentContent + resultMessage,
          };
        }
        return updated;
      });

      // Save the updated message
      if (selectedConversationId) {
        const lastMessage = chatMessages[chatMessages.length - 1];
        if (lastMessage?.role === 'assistant') {
          const resultMessage =
            successCount === totalCount
              ? `\n\n${totalCount}件のタスクを作成しました。`
              : `\n\n${successCount}/${totalCount}件のタスクを作成しました。`;
          await addAssistantMessage(lastMessage.content + resultMessage);
        }
      }
    } catch (error) {
      console.error('Tool execution error:', error);
    } finally {
      setIsExecutingTools(false);
      setShowToolConfirm(false);
      setPendingTools(null);
      clearPendingToolCalls();
    }
  }, [
    pendingTools,
    projectId,
    context.user.id,
    context.project.lists,
    setMessages,
    selectedConversationId,
    chatMessages,
    addAssistantMessage,
    clearPendingToolCalls,
  ]);

  // Handle tool cancellation
  const handleToolCancel = useCallback(() => {
    setShowToolConfirm(false);
    setPendingTools(null);
    clearPendingToolCalls();

    // Add a message indicating the user cancelled
    setMessages((prev) => {
      const updated = [...prev];
      const lastIndex = updated.length - 1;
      if (updated[lastIndex]?.role === 'assistant') {
        updated[lastIndex] = {
          ...updated[lastIndex],
          content: updated[lastIndex].content + '\n\n（タスク作成がキャンセルされました）',
        };
      }
      return updated;
    });
  }, [clearPendingToolCalls, setMessages]);

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
              {context.task && (
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
                {chatMessages.length === 0 ? (
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
                    {chatMessages.map((message, index) => (
                      <ChatMessage
                        key={message.id || index}
                        message={message}
                        isStreaming={
                          chatLoading &&
                          index === chatMessages.length - 1 &&
                          message.role === 'assistant'
                        }
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Error display */}
              {(chatError || conversationError) && (
                <div className="border-t bg-destructive/10 px-4 py-2 text-sm text-destructive">
                  {chatError || conversationError}
                </div>
              )}

              {/* Input */}
              <ChatInput
                onSend={handleSendMessage}
                isLoading={chatLoading}
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
        isExecuting={isExecutingTools}
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

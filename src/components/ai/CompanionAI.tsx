'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bot,
  X,
  Settings,
  AlertCircle,
  Calendar,
  FileText,
  BarChart3,
  MessageCircle,
  Loader2,
  Trash2,
  Plus,
  Sun,
  ClipboardList,
  Search,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useAISettingsStore } from '@/stores/aiSettingsStore';
import { useUnifiedConversation } from '@/hooks/useUnifiedConversation';
import { useCompanionState } from '@/hooks/useCompanionState';
import { useUnifiedConversations } from '@/hooks/useUnifiedConversations';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { ToolConfirmDialog } from './ToolConfirmDialog';
import { AIContext, PROVIDER_DISPLAY_NAMES } from '@/types/ai';
import { ToolCall } from '@/lib/ai/tools/types';
import { useRouter } from 'next/navigation';

// Quick action button types
interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  message: string;
}

interface CompanionAIProps {
  projectId: string | null;
}

export function CompanionAI({ projectId }: CompanionAIProps) {
  const router = useRouter();
  const { user, firebaseUser } = useAuth();
  // Derive userId/displayName with firebaseUser fallback (when Firestore is inaccessible)
  const userId = user?.id || firebaseUser?.uid || '';
  const displayName = user?.displayName || firebaseUser?.displayName || '';
  const { projects, isLoading: projectsLoading } = useProjects();
  const { provider, isConfigured } = useAISettingsStore();
  const {
    timePeriod,
    currentHour,
    shouldShowMorningGreeting,
    shouldShowEveningReport,
    markMorningGreeted,
    markEveningReported,
    hasBadge,
  } = useCompanionState();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showConversations, setShowConversations] = useState(false);
  const [showToolConfirm, setShowToolConfirm] = useState(false);
  const [pendingTools, setPendingTools] = useState<ToolCall[] | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Find current project details
  const currentProject = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId]
  );

  // Build context dynamically based on projectId
  const companionContext: AIContext = useMemo(() => {
    if (projectId && currentProject) {
      return {
        scope: 'companion' as const,
        project: {
          id: currentProject.id,
          name: currentProject.name,
          description: currentProject.description || '',
          lists: [],
          members: [],
        },
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          lists: [],
          members: [],
        })),
        user: {
          id: userId,
          displayName,
        },
        currentHour,
      };
    }
    return {
      scope: 'companion' as const,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        lists: [],
        members: [],
      })),
      user: {
        id: userId,
        displayName,
      },
      currentHour,
    };
  }, [userId, displayName, projects, currentProject, projectId, currentHour]);

  // Dynamic quick actions based on context
  const quickActions: QuickAction[] = useMemo(() => {
    if (projectId) {
      // Project page actions
      return [
        {
          id: 'create_task',
          label: 'タスク作成',
          icon: <ClipboardList className="h-4 w-4" />,
          message: '新しいタスクを作成してください',
        },
        {
          id: 'summary',
          label: 'プロジェクト概要',
          icon: <Search className="h-4 w-4" />,
          message: 'このプロジェクトの概要を教えてください',
        },
        {
          id: 'overdue',
          label: '期限切れ確認',
          icon: <Clock className="h-4 w-4" />,
          message: '期限切れのタスクはありますか？',
        },
        {
          id: 'report',
          label: '日報生成',
          icon: <FileText className="h-4 w-4" />,
          message: '今日の日報を生成してください',
        },
      ];
    }

    // Dashboard actions (time-aware)
    const planAction: QuickAction = {
      id: 'plan',
      label: '今日の計画',
      icon: <Sun className="h-4 w-4" />,
      message: '今日のタスクを整理して、優先順位を教えてください',
    };
    const reportAction: QuickAction = {
      id: 'report',
      label: '日報生成',
      icon: <FileText className="h-4 w-4" />,
      message: '今日の日報を生成してください',
    };
    const priorityAction: QuickAction = {
      id: 'priority',
      label: '優先順位',
      icon: <Calendar className="h-4 w-4" />,
      message: '今日取り組むべきタスクを優先順位付けして教えてください',
    };
    const workloadAction: QuickAction = {
      id: 'workload',
      label: '負荷確認',
      icon: <BarChart3 className="h-4 w-4" />,
      message: '現在のワークロードを分析してください',
    };

    if (timePeriod === 'morning' || timePeriod === 'afternoon') {
      return [planAction, priorityAction, workloadAction, reportAction];
    }
    return [reportAction, priorityAction, workloadAction, planAction];
  }, [projectId, timePeriod]);

  // Project IDs for cross-project tools
  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);

  // Conversations list (filtered by projectId context)
  const {
    conversations,
    isLoading: conversationsLoading,
    deleteConversationById,
  } = useUnifiedConversations({
    userId: userId || null,
    projectId: projectId ?? null,
  });

  // Conversation hook
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    confirmToolExecution,
    cancelToolExecution,
    clearMessages,
  } = useUnifiedConversation({
    userId,
    projectId,
    projectIds,
    context: companionContext,
    conversationId: selectedConversationId,
    onConversationCreated: (id) => setSelectedConversationId(id),
    onToolConfirmRequired: (toolCalls) => {
      setPendingTools(toolCalls);
      setShowToolConfirm(true);
    },
  });

  // Reset conversation when projectId changes
  useEffect(() => {
    setSelectedConversationId(null);
    clearMessages();
  }, [projectId]);

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog && dialog.contains(e.target as Node)) {
          return;
        }
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close panel on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Remember open state in localStorage
  useEffect(() => {
    const stored = localStorage.getItem('companionAIPanelOpen');
    if (stored === 'true') {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('companionAIPanelOpen', String(isOpen));
  }, [isOpen]);

  // Handle sending a message
  const handleSendMessage = useCallback(async (content: string) => {
    if (!userId) return;
    await sendMessage(content);
  }, [userId, sendMessage]);

  // Handle quick action
  const handleQuickAction = useCallback((action: QuickAction) => {
    handleSendMessage(action.message);
  }, [handleSendMessage]);

  // Handle new conversation
  const handleNewConversation = useCallback(() => {
    setSelectedConversationId(null);
    clearMessages();
  }, [clearMessages]);

  // Handle selecting a conversation
  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
  }, []);

  // Handle deleting a conversation
  const handleDeleteConversation = useCallback(async (id: string) => {
    await deleteConversationById(id);
    if (selectedConversationId === id) {
      setSelectedConversationId(null);
      clearMessages();
    }
  }, [deleteConversationById, selectedConversationId, clearMessages]);

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

  // Navigate to settings
  const handleGoToSettings = useCallback(() => {
    setIsOpen(false);
    router.push('/settings/ai');
  }, [router]);

  const isApiConfigured = isConfigured();

  // Header title
  const headerTitle = useMemo(() => {
    if (projectId && currentProject) {
      return `相棒 - ${currentProject.name}`;
    }
    if (timePeriod === 'morning') return '相棒 - 朝の準備';
    if (timePeriod === 'evening') return '相棒 - 今日の振り返り';
    return '相棒';
  }, [projectId, currentProject, timePeriod]);

  // Disable check - need either projects (dashboard) or projectId (project page)
  const isDisabled = !projectId && projectIds.length === 0;

  // Auto-greeting on panel open (dashboard only)
  const autoGreetSentRef = useRef(false);
  useEffect(() => {
    if (
      isOpen &&
      !projectId &&
      messages.length === 0 &&
      !selectedConversationId &&
      isApiConfigured &&
      projectIds.length > 0 &&
      !autoGreetSentRef.current
    ) {
      if (shouldShowMorningGreeting) {
        autoGreetSentRef.current = true;
        markMorningGreeted();
        const timer = setTimeout(() => {
          sendMessage('おはようございます！今日のタスクを整理して、優先順位を教えてください。');
        }, 500);
        return () => clearTimeout(timer);
      } else if (shouldShowEveningReport) {
        autoGreetSentRef.current = true;
        markEveningReported();
        const timer = setTimeout(() => {
          sendMessage('お疲れ様でした！今日の日報を作成してください。');
        }, 500);
        return () => clearTimeout(timer);
      }
    }
    if (!isOpen || selectedConversationId) {
      autoGreetSentRef.current = false;
    }
  }, [isOpen, projectId, messages.length, selectedConversationId, isApiConfigured, projectIds.length, shouldShowMorningGreeting, shouldShowEveningReport, markMorningGreeted, markEveningReported, sendMessage]);

  if (!firebaseUser) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105',
          isOpen
            ? 'bg-muted text-muted-foreground'
            : projectId
              ? 'bg-primary text-primary-foreground'
              : timePeriod === 'morning'
                ? 'bg-amber-600 text-white'
                : timePeriod === 'evening'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-primary text-primary-foreground'
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Bot className="h-6 w-6" />
        )}
        {hasBadge && !isOpen && !projectId && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-red-500" />
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-6 z-50 flex h-[600px] w-[420px] flex-col overflow-hidden rounded-lg border bg-background shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <MessageCircle className="h-5 w-5 shrink-0" />
              <span className="truncate font-medium">
                {headerTitle}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                ({PROVIDER_DISPLAY_NAMES[provider]})
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setShowConversations(!showConversations)}
              >
                {showConversations ? '履歴を隠す' : '履歴'}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleGoToSettings}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isApiConfigured ? (
            /* API Key Not Configured */
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
              {/* Conversation List (collapsible) */}
              {showConversations && (
                <div className="flex w-44 shrink-0 flex-col border-r">
                  <div className="flex items-center justify-between border-b px-2 py-2">
                    <span className="text-xs font-medium text-muted-foreground">会話履歴</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleNewConversation}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {conversationsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                        会話履歴はありません
                      </div>
                    ) : (
                      conversations.map((conv) => (
                        <div
                          key={conv.id}
                          className={cn(
                            'group flex cursor-pointer items-center justify-between gap-1 border-b px-2 py-2 text-xs hover:bg-muted',
                            selectedConversationId === conv.id && 'bg-muted'
                          )}
                          onClick={() => handleSelectConversation(conv.id)}
                        >
                          <span className="flex-1 truncate">{conv.title}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteConversation(conv.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Main Chat Area */}
              <div className="flex min-h-0 flex-1 flex-col">
                {/* Context Preview (project page with task selected) */}
                {projectId && companionContext.task && companionContext.project && (
                  <div className="border-b bg-muted/30 px-4 py-2">
                    <div className="text-xs text-muted-foreground">
                      コンテキスト: {companionContext.project.name}
                    </div>
                    <div className="truncate text-sm font-medium">
                      {companionContext.task.title}
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                      <div className="mb-4 rounded-full bg-muted p-4">
                        <Bot className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium">
                        {projectId
                          ? `${currentProject?.name || 'プロジェクト'}のサポート`
                          : timePeriod === 'morning'
                            ? 'おはようございます！'
                            : timePeriod === 'evening'
                              ? 'お疲れ様です！'
                              : '相棒'}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {projectId
                          ? 'タスクやプロジェクトについて何でも聞いてください'
                          : timePeriod === 'morning'
                            ? '今日のタスクを整理しましょう'
                            : timePeriod === 'afternoon'
                              ? '午後も頑張りましょう'
                              : timePeriod === 'evening'
                                ? '今日の振り返りをしませんか？'
                                : '何かお手伝いできることはありますか？'}
                      </p>

                      {/* Quick Actions */}
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {quickActions.map((action) => (
                          <button
                            key={action.id}
                            onClick={() => handleQuickAction(action)}
                            disabled={projectsLoading || isDisabled}
                            className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted disabled:opacity-50"
                          >
                            {action.icon}
                            {action.label}
                          </button>
                        ))}
                      </div>

                      {isDisabled && !projectsLoading && (
                        <p className="mt-4 text-xs text-muted-foreground">
                          プロジェクトがありません。まずプロジェクトを作成してください。
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      {messages
                        .filter((message, index) => {
                          if (message.role === 'tool') return false;
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

                {/* Quick Actions Bar (visible when messages exist) */}
                {messages.length > 0 && (
                  <div className="flex flex-wrap gap-1 border-t px-3 py-2">
                    {quickActions.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => handleQuickAction(action)}
                        disabled={isLoading || isDisabled}
                        className="flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-xs transition-colors hover:bg-muted disabled:opacity-50"
                      >
                        {action.icon}
                        <span className="hidden sm:inline">{action.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Input */}
                <ChatInput
                  onSend={handleSendMessage}
                  isLoading={isLoading}
                  disabled={isDisabled}
                  placeholder={
                    projectId
                      ? 'プロジェクトについて質問...'
                      : '何でも聞いてください...'
                  }
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tool Confirmation Dialog */}
      <ToolConfirmDialog
        open={showToolConfirm}
        onOpenChange={setShowToolConfirm}
        toolCalls={pendingTools || []}
        onConfirm={handleToolConfirm}
        onCancel={handleToolCancel}
        isExecuting={isLoading}
      />
    </>
  );
}

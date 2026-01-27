'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/common/Header';
import { Sidebar } from '@/components/common/Sidebar';
import { ProjectFormModal } from '@/components/project/ProjectFormModal';
import { ShortcutHelpModal } from '@/components/ShortcutHelpModal';
import { Loader2 } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { useHotkeys } from '@/hooks/useHotkeys';
import { SupportAIPanel } from '@/components/ai/SupportAIPanel';
import { PersonalAIButton } from '@/components/ai/PersonalAIButton';
import { AIContext } from '@/types/ai';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { isSidebarOpen, isSidebarCollapsed, openProjectModal } = useUIStore();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Extract projectId from pathname if on a project page
  const currentProjectId = useMemo(() => {
    const match = pathname?.match(/\/projects\/([^/]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  // Create basic AI context (full context will be provided by project pages)
  const defaultAIContext: AIContext = useMemo(() => ({
    scope: 'project',
    project: {
      id: currentProjectId || '',
      name: 'ダッシュボード',
      description: '',
      lists: [],
      members: [],
    },
    user: {
      id: user?.id || '',
      displayName: user?.displayName || 'ユーザー',
    },
  }), [user, currentProjectId]);

  // Hotkey callbacks
  const handleNewTask = useCallback(() => {
    // Focus on the first "Add task" input if on board page
    if (pathname?.includes('/board')) {
      const addTaskInput = document.querySelector('[data-testid="board-view"] input[placeholder*="タスク"]') as HTMLInputElement;
      if (addTaskInput) {
        addTaskInput.focus();
        return;
      }
    }
    // Otherwise open project modal for quick access
    openProjectModal();
  }, [pathname, openProjectModal]);

  const handleSearch = useCallback(() => {
    // Focus on search input in header
    const searchInput = document.querySelector('input[placeholder*="検索"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  }, []);

  const handleEscape = useCallback(() => {
    setIsHelpOpen(false);
    // Also blur any focused element
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  const handleShowHelp = useCallback(() => {
    setIsHelpOpen(true);
  }, []);

  // Register hotkeys
  const hotkeys = useMemo(
    () => [
      { key: 'n', callback: handleNewTask },
      { key: 'Escape', callback: handleEscape },
      { key: '/', callback: handleSearch },
      { key: '?', callback: handleShowHelp, shiftKey: true },
    ],
    [handleNewTask, handleEscape, handleSearch, handleShowHelp]
  );

  useHotkeys(hotkeys);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <NotificationProvider>
      <div className="flex h-screen min-w-[480px] flex-col overflow-hidden">
        <Header />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <main
            className={cn(
              'flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50 p-4 lg:ml-0 lg:p-6',
              isSidebarOpen && (isSidebarCollapsed ? 'ml-16' : 'ml-64')
            )}
          >
            {children}
          </main>
        </div>
        <ProjectFormModal />
        <ShortcutHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        {/* Project AI Panel for project pages, Personal AI Button for dashboard */}
        {currentProjectId ? (
          <SupportAIPanel projectId={currentProjectId} context={defaultAIContext} />
        ) : (
          <PersonalAIButton />
        )}
      </div>
    </NotificationProvider>
  );
}

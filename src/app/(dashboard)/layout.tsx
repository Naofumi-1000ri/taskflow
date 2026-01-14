'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/common/Header';
import { Sidebar } from '@/components/common/Sidebar';
import { ProjectFormModal } from '@/components/project/ProjectFormModal';
import { Loader2 } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import { NotificationProvider } from '@/contexts/NotificationContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { isSidebarOpen, isSidebarCollapsed } = useUIStore();

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
              'flex min-h-0 flex-1 flex-col overflow-y-auto bg-gray-50 p-4 lg:ml-0 lg:p-6',
              isSidebarOpen && (isSidebarCollapsed ? 'ml-16' : 'ml-64')
            )}
          >
            {children}
          </main>
        </div>
        <ProjectFormModal />
      </div>
    </NotificationProvider>
  );
}

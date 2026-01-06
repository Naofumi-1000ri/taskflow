'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  Plus,
  Settings,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useUIStore } from '@/stores/uiStore';
import { useProjects } from '@/hooks/useProjects';

const navigation = [
  { name: 'ダッシュボード', href: '/', icon: LayoutDashboard },
  { name: 'プロジェクト', href: '/projects', icon: FolderKanban },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isSidebarOpen, isSidebarCollapsed, setSidebarCollapsed, openProjectModal } = useUIStore();
  const { projects } = useProjects();

  if (!isSidebarOpen) return null;

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex min-h-0 flex-col border-r bg-background transition-all duration-300 lg:static lg:h-full',
        isSidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        {!isSidebarCollapsed && (
          <span className="font-semibold">メニュー</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
          className={cn(isSidebarCollapsed && 'mx-auto')}
        >
          <ChevronLeft
            className={cn(
              'h-4 w-4 transition-transform',
              isSidebarCollapsed && 'rotate-180'
            )}
          />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-2 py-4">
        <nav className="flex flex-col gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  isSidebarCollapsed && 'justify-center px-2'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!isSidebarCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <Separator className="my-4" />

        <div className="space-y-2">
          <div className="flex items-center justify-between px-3">
            {!isSidebarCollapsed && (
              <span className="text-xs font-medium uppercase text-muted-foreground">
                プロジェクト
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => openProjectModal()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <nav className="flex flex-col gap-1">
            {projects.map((project) => {
              const isActive = pathname === `/projects/${project.id}/board`;
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}/board`}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-muted font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    isSidebarCollapsed && 'justify-center px-2'
                  )}
                >
                  {project.iconUrl ? (
                    <img
                      src={project.iconUrl}
                      alt={project.name}
                      className="h-5 w-5 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs"
                      style={{ backgroundColor: project.color }}
                    >
                      {project.icon}
                    </div>
                  )}
                  {!isSidebarCollapsed && (
                    <span className="truncate">{project.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </ScrollArea>

      <div className="flex-shrink-0 border-t p-2">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            isSidebarCollapsed && 'justify-center px-2'
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!isSidebarCollapsed && <span>設定</span>}
        </Link>
      </div>
    </aside>
  );
}

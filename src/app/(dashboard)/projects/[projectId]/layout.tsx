'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LayoutGrid, GanttChart, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProject } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const tabs = [
  { name: 'ボード', href: 'board', icon: LayoutGrid },
  { name: 'ガントチャート', href: 'gantt', icon: GanttChart },
  { name: '設定', href: 'settings', icon: Settings },
];

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;
  const { project, isLoading } = useProject(projectId);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <h2 className="text-lg font-semibold">プロジェクトが見つかりません</h2>
        <Button asChild className="mt-4">
          <Link href="/projects">プロジェクト一覧に戻る</Link>
        </Button>
      </div>
    );
  }

  const currentTab = pathname.split('/').pop();

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Project Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
              style={{ backgroundColor: `${project.color}20` }}
            >
              {project.icon}
            </div>
            <div>
              <h1 className="text-xl font-bold">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {project.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-4">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.href;
            return (
              <Link
                key={tab.name}
                href={`/projects/${projectId}/${tab.href}`}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1">{children}</div>
    </div>
  );
}

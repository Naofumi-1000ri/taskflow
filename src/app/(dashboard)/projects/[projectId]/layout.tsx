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
    <div className="flex h-full flex-col overflow-hidden">
      {/* Twitter/X Style Header */}
      <div className="relative mb-4 flex-shrink-0">
        {/* Back Button - Absolute positioned */}
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="absolute left-2 top-2 z-10 bg-background/80 backdrop-blur-sm hover:bg-background/90"
        >
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        {/* Header Image or Colored Banner */}
        <div
          className="w-full overflow-hidden rounded-lg h-[100px] sm:h-[120px] md:h-[150px] lg:h-[180px]"
          style={{
            backgroundColor: project.headerImageUrl ? undefined : `${project.color}30`,
          }}
        >
          {project.headerImageUrl && (
            <img
              src={project.headerImageUrl}
              alt={`${project.name} header`}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        {/* Avatar - Overlapping */}
        <div className="absolute -bottom-6 left-3 sm:-bottom-7 sm:left-4 lg:-bottom-8">
          <div className="rounded-full border-2 sm:border-4 border-background bg-background">
            {project.iconUrl ? (
              <img
                src={project.iconUrl}
                alt={project.name}
                className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 rounded-full object-cover"
              />
            ) : (
              <div
                className="flex h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 items-center justify-center rounded-full text-xl sm:text-2xl"
                style={{ backgroundColor: `${project.color}40` }}
              >
                {project.icon}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Project Info - Below Avatar */}
      <div className="mb-4 flex-shrink-0 pl-[72px] sm:pl-20 lg:pl-24">
        <h1 className="text-xl font-bold">{project.name}</h1>
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-1">
            {project.description}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex-shrink-0 border-b">
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
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

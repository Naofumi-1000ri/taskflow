'use client';

import { Plus, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectCard } from '@/components/project/ProjectCard';
import { useProjects } from '@/hooks/useProjects';
import { useUIStore } from '@/stores/uiStore';
import { Loader2 } from 'lucide-react';

export default function ProjectsPage() {
  const { projects, isLoading, archive, remove } = useProjects();
  const { openProjectModal } = useUIStore();

  const handleArchive = async (projectId: string) => {
    if (confirm('このプロジェクトをアーカイブしますか？')) {
      await archive(projectId, true);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (confirm('このプロジェクトを削除しますか？この操作は取り消せません。')) {
      await remove(projectId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">プロジェクト</h1>
          <p className="text-muted-foreground">
            {projects.length} 件のプロジェクト
          </p>
        </div>
        <Button onClick={() => openProjectModal()}>
          <Plus className="mr-2 h-4 w-4" />
          新規プロジェクト
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FolderKanban className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">
            プロジェクトがありません
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            新しいプロジェクトを作成して、タスク管理を始めましょう
          </p>
          <Button className="mt-4" onClick={() => openProjectModal()}>
            <Plus className="mr-2 h-4 w-4" />
            プロジェクトを作成
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

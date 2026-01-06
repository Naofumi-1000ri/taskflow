'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderKanban, Plus, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/uiStore';
import { PersonalMemo } from '@/components/dashboard/PersonalMemo';

export default function DashboardPage() {
  const { user } = useAuth();
  const { projects, isLoading, error } = useProjects();
  const { openProjectModal } = useUIStore();

  const isOfflineError = error?.message?.includes('offline');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-32" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <WifiOff className="mb-4 h-16 w-16 text-muted-foreground/50" />
        <h2 className="mb-2 text-xl font-semibold">
          {isOfflineError ? 'オフラインです' : 'エラーが発生しました'}
        </h2>
        <p className="mb-4 text-center text-muted-foreground">
          {isOfflineError
            ? 'インターネット接続を確認してください'
            : error.message}
        </p>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          再読み込み
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold">
          おかえりなさい、{user?.displayName?.split(' ')[0] || 'ユーザー'}さん
        </h1>
        <p className="text-muted-foreground">
          今日も頑張りましょう
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Memo */}
        <PersonalMemo />

        {/* Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>プロジェクト（{projects.length}）</CardTitle>
              <CardDescription>参加中のプロジェクト</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => openProjectModal()}>
              <Plus className="mr-2 h-4 w-4" />
              新規作成
            </Button>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  プロジェクトがありません
                </p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => openProjectModal()}
                >
                  最初のプロジェクトを作成
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}/board`}
                    className="block"
                  >
                    <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
                      {project.iconUrl ? (
                        <img
                          src={project.iconUrl}
                          alt={project.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
                          style={{ backgroundColor: project.color }}
                        >
                          {project.icon}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {project.description || 'プロジェクトの説明がありません'}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

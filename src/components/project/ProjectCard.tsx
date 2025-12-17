'use client';

import Link from 'next/link';
import { MoreHorizontal, Users, Archive, Trash2, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Project } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface ProjectCardProps {
  project: Project;
  taskCount?: number;
  onArchive?: (projectId: string) => void;
  onDelete?: (projectId: string) => void;
}

export function ProjectCard({
  project,
  taskCount = 0,
  onArchive,
  onDelete,
}: ProjectCardProps) {
  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-md" data-testid="project-card">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: project.color }}
      />

      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <Link
          href={`/projects/${project.id}/board`}
          className="flex items-center gap-3"
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
            style={{ backgroundColor: `${project.color}20` }}
          >
            {project.icon}
          </div>
          <div>
            <h3 className="font-semibold leading-none tracking-tight hover:underline">
              {project.name}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              更新: {formatDistanceToNow(project.updatedAt, { addSuffix: true, locale: ja })}
            </p>
          </div>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/projects/${project.id}/settings`}>
                <Settings className="mr-2 h-4 w-4" />
                設定
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onArchive?.(project.id)}>
              <Archive className="mr-2 h-4 w-4" />
              アーカイブ
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete?.(project.id)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent>
        {project.description && (
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
            {project.description}
          </p>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{project.memberIds.length}</span>
          </div>
          <span>{taskCount} タスク</span>
        </div>
      </CardContent>
    </Card>
  );
}

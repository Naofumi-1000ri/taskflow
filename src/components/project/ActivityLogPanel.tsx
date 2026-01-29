'use client';

import { useActivityLog } from '@/hooks/useActivityLog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  UserPlus,
  UserMinus,
  Loader2,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { ActivityAction, ActivityLog } from '@/types';

interface ActivityLogPanelProps {
  projectId: string;
}

const actionConfig: Record<ActivityAction, { icon: typeof Plus; label: string; color: string }> = {
  create: { icon: Plus, label: '作成', color: 'text-green-600' },
  update: { icon: Pencil, label: '更新', color: 'text-blue-600' },
  delete: { icon: Trash2, label: '削除', color: 'text-red-600' },
  move: { icon: ArrowRight, label: '移動', color: 'text-purple-600' },
  complete: { icon: CheckCircle2, label: '完了', color: 'text-green-600' },
  reopen: { icon: RotateCcw, label: '再開', color: 'text-orange-600' },
  assign: { icon: UserPlus, label: '担当割当', color: 'text-blue-600' },
  unassign: { icon: UserMinus, label: '担当解除', color: 'text-gray-600' },
  add_member: { icon: UserPlus, label: 'メンバー追加', color: 'text-green-600' },
  remove_member: { icon: UserMinus, label: 'メンバー削除', color: 'text-red-600' },
};

function ActivityLogItem({ log }: { log: ActivityLog }) {
  const config = actionConfig[log.action] || actionConfig.update;
  const Icon = config.icon;

  return (
    <div className="flex gap-3 px-3 py-2">
      <div className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted', config.color)}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium">{log.userName}</span>
          {' '}
          <span className="text-muted-foreground">が</span>
          {' '}
          <span className="font-medium">{log.targetName}</span>
          {' '}
          <span className="text-muted-foreground">を{config.label}</span>
        </p>
        {log.changes && log.changes.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {log.changes.map((change, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {change.field}:
                {change.oldValue && (
                  <span className="line-through"> {change.oldValue}</span>
                )}
                {change.newValue && (
                  <span className="font-medium"> {change.newValue}</span>
                )}
              </p>
            ))}
          </div>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDistanceToNow(log.createdAt, { addSuffix: true, locale: ja })}
        </p>
      </div>
      <Badge variant="outline" className="h-fit shrink-0 text-[10px]">
        {log.targetType === 'task' ? 'タスク' :
         log.targetType === 'list' ? 'リスト' :
         log.targetType === 'project' ? 'プロジェクト' :
         'メンバー'}
      </Badge>
    </div>
  );
}

export function ActivityLogPanel({ projectId }: ActivityLogPanelProps) {
  const { logs, isLoading } = useActivityLog(projectId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
        <History className="h-8 w-8" />
        <p className="text-sm">アクティビティはまだありません</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y">
        {logs.map((log) => (
          <ActivityLogItem key={log.id} log={log} />
        ))}
      </div>
    </ScrollArea>
  );
}

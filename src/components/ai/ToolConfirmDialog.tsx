'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ToolCall } from '@/lib/ai/tools/types';
import { getToolCallsDescription } from '@/lib/ai/toolExecutor';
import { CheckCircle2, ListTodo, Loader2 } from 'lucide-react';

interface ToolConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolCalls: ToolCall[];
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting?: boolean;
}

export function ToolConfirmDialog({
  open,
  onOpenChange,
  toolCalls,
  onConfirm,
  onCancel,
  isExecuting = false,
}: ToolConfirmDialogProps) {
  const descriptions = getToolCallsDescription(toolCalls);
  const taskCount = toolCalls.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isExecuting}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            タスクを作成しますか？
          </DialogTitle>
          <DialogDescription>
            AIが以下の{taskCount > 1 ? `${taskCount}件の` : ''}タスクを作成しようとしています。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 overflow-y-auto">
          <ul className="space-y-2">
            {descriptions.map((desc, index) => (
              <li
                key={index}
                className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{desc}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isExecuting}
          >
            キャンセル
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isExecuting}
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                作成中...
              </>
            ) : (
              <>作成する</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

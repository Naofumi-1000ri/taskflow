'use client';

import { AIConversation } from '@/types/ai';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MessageSquare, Trash2, Plus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ConversationListProps {
  conversations: AIConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewConversation: () => void;
  isLoading?: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onDelete,
  onNewConversation,
  isLoading = false,
}: ConversationListProps) {
  return (
    <div className="flex h-full flex-col border-r bg-muted/30">
      <div className="flex items-center justify-between border-b p-3">
        <span className="text-sm font-medium">会話履歴</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewConversation}
          className="h-8 w-8"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <span className="text-sm text-muted-foreground">読み込み中...</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <span className="text-sm text-muted-foreground">
              まだ会話がありません
            </span>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={onNewConversation}
            >
              <Plus className="mr-1 h-3 w-3" />
              新しい会話を開始
            </Button>
          </div>
        ) : (
          <ul className="p-2 space-y-1">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <ConversationItem
                  conversation={conversation}
                  isSelected={selectedId === conversation.id}
                  onSelect={() => onSelect(conversation.id)}
                  onDelete={() => onDelete(conversation.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface ConversationItemProps {
  conversation: AIConversation;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function ConversationItem({
  conversation,
  isSelected,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return '今日';
    } else if (days === 1) {
      return '昨日';
    } else if (days < 7) {
      return `${days}日前`;
    } else {
      return date.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors',
        isSelected
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted'
      )}
      onClick={onSelect}
    >
      <MessageSquare className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="truncate">{conversation.title}</div>
        <div
          className={cn(
            'text-xs',
            isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          {formatDate(conversation.updatedAt)}
        </div>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100',
              isSelected && 'hover:bg-primary-foreground/10'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>会話を削除</AlertDialogTitle>
            <AlertDialogDescription>
              「{conversation.title}」を削除しますか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

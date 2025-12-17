'use client';

import { useState } from 'react';
import { CheckSquare, Plus, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Checklist, ChecklistItem } from '@/types';
import { getTaskProgress } from '@/lib/utils/task';

interface ChecklistSectionProps {
  checklists: Checklist[];
  onAddChecklist: (title: string) => void;
  onDeleteChecklist: (checklistId: string) => void;
  onAddItem: (checklistId: string, text: string) => void;
  onToggleItem: (checklistId: string, itemId: string) => void;
  onDeleteItem: (checklistId: string, itemId: string) => void;
}

export function ChecklistSection({
  checklists,
  onAddChecklist,
  onDeleteChecklist,
  onAddItem,
  onToggleItem,
  onDeleteItem,
}: ChecklistSectionProps) {
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');

  const handleAddChecklist = () => {
    if (newChecklistTitle.trim()) {
      onAddChecklist(newChecklistTitle.trim());
      setNewChecklistTitle('');
      setIsAddingChecklist(false);
    }
  };

  const handleAddItem = (checklistId: string) => {
    if (newItemText.trim()) {
      onAddItem(checklistId, newItemText.trim());
      setNewItemText('');
      setAddingItemTo(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-medium">
          <CheckSquare className="h-4 w-4" />
          チェックリスト
        </h3>
        {!isAddingChecklist && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAddingChecklist(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            追加
          </Button>
        )}
      </div>

      {/* Add Checklist Form */}
      {isAddingChecklist && (
        <div className="space-y-2 rounded-lg border p-3">
          <Input
            value={newChecklistTitle}
            onChange={(e) => setNewChecklistTitle(e.target.value)}
            placeholder="チェックリスト名..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddChecklist();
              if (e.key === 'Escape') {
                setNewChecklistTitle('');
                setIsAddingChecklist(false);
              }
            }}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddChecklist}>
              追加
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setNewChecklistTitle('');
                setIsAddingChecklist(false);
              }}
            >
              キャンセル
            </Button>
          </div>
        </div>
      )}

      {/* Checklists */}
      {checklists.map((checklist) => {
        const progress = getTaskProgress(checklist.items);

        return (
          <div key={checklist.id} className="space-y-2 rounded-lg border p-3">
            {/* Checklist Header */}
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{checklist.title}</h4>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {progress.completed}/{progress.total}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onDeleteChecklist(checklist.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      削除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Progress Bar */}
            {checklist.items.length > 0 && (
              <Progress value={progress.percentage} className="h-2" />
            )}

            {/* Items */}
            <div className="space-y-1">
              {checklist.items.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-2 rounded p-1 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={item.isChecked}
                    onCheckedChange={() => onToggleItem(checklist.id, item.id)}
                  />
                  <span
                    className={cn(
                      'flex-1 text-sm',
                      item.isChecked && 'text-muted-foreground line-through'
                    )}
                  >
                    {item.text}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => onDeleteItem(checklist.id, item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add Item */}
            {addingItemTo === checklist.id ? (
              <div className="flex gap-2">
                <Input
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder="項目を追加..."
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddItem(checklist.id);
                    if (e.key === 'Escape') {
                      setNewItemText('');
                      setAddingItemTo(null);
                    }
                  }}
                />
                <Button size="sm" onClick={() => handleAddItem(checklist.id)}>
                  追加
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={() => setAddingItemTo(checklist.id)}
              >
                <Plus className="mr-1 h-4 w-4" />
                項目を追加
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

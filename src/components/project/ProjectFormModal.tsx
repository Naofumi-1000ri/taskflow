'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProjects } from '@/hooks/useProjects';
import { useUIStore } from '@/stores/uiStore';
import { LIST_COLORS } from '@/types';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const PROJECT_ICONS = ['📁', '🚀', '💼', '🎯', '📊', '🔧', '💡', '🎨', '📱', '🌐'];

export function ProjectFormModal() {
  const router = useRouter();
  const { isProjectModalOpen, selectedProjectId, closeProjectModal } = useUIStore();
  const { create } = useProjects();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(LIST_COLORS[0].value);
  const [icon, setIcon] = useState<string>(PROJECT_ICONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!selectedProjectId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('プロジェクト名を入力してください');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const projectId = await create({
        name: name.trim(),
        description: description.trim(),
        color,
        icon,
      });

      // Reset form
      setName('');
      setDescription('');
      setColor(LIST_COLORS[0].value);
      setIcon(PROJECT_ICONS[0]);
      closeProjectModal();

      // Navigate to the new project
      router.push(`/projects/${projectId}/board`);
    } catch (err) {
      setError('プロジェクトの作成に失敗しました');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setColor(LIST_COLORS[0].value);
    setIcon(PROJECT_ICONS[0]);
    setError(null);
    closeProjectModal();
  };

  return (
    <Dialog open={isProjectModalOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'プロジェクトを編集' : '新規プロジェクト'}
            </DialogTitle>
            <DialogDescription>
              プロジェクトの基本情報を入力してください
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Icon Selection */}
            <div className="space-y-2">
              <Label>アイコン</Label>
              <div className="flex flex-wrap gap-2">
                {PROJECT_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg border-2 text-xl transition-colors',
                      icon === emoji
                        ? 'border-primary bg-primary/10'
                        : 'border-transparent bg-muted hover:bg-muted/80'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div className="space-y-2">
              <Label>カラー</Label>
              <div className="flex flex-wrap gap-2">
                {LIST_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={cn(
                      'h-8 w-8 rounded-full transition-all',
                      color === c.value
                        ? 'ring-2 ring-offset-2 ring-primary'
                        : 'hover:scale-110'
                    )}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>

            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="name">プロジェクト名 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: Webサイトリニューアル"
                disabled={isSubmitting}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="プロジェクトの概要を入力..."
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? '保存' : '作成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

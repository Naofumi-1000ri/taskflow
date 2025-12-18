'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useProject } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LIST_COLORS } from '@/types';
import type { User } from '@/types';
import { cn } from '@/lib/utils';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import { getUsersByIds, getUserByEmail } from '@/lib/firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PROJECT_ICONS = ['📁', '🚀', '💼', '🎯', '📊', '🔧', '💡', '🎨', '📱', '🌐'];

export default function ProjectSettingsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { project, members, isLoading, update, addMember } = useProject(projectId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [icon, setIcon] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [memberUsers, setMemberUsers] = useState<User[]>([]);

  // Invite member state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [inviteError, setInviteError] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Initialize form when project loads
  useState(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description);
      setColor(project.color);
      setIcon(project.icon);
    }
  });

  // Fetch member user details
  useEffect(() => {
    if (members.length > 0) {
      const userIds = members.map((m) => m.userId);
      getUsersByIds(userIds).then(setMemberUsers);
    }
  }, [members]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await update({
        name: name || project.name,
        description: description || project.description,
        color: color || project.color,
        icon: icon || project.icon,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return '管理者';
      case 'editor':
        return '編集者';
      case 'viewer':
        return '閲覧者';
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'editor':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      setInviteError('メールアドレスを入力してください');
      return;
    }

    setIsInviting(true);
    setInviteError('');

    try {
      // Check if user exists
      const user = await getUserByEmail(inviteEmail.trim());
      if (!user) {
        setInviteError('このメールアドレスのユーザーが見つかりません。先にログインしてもらってください。');
        return;
      }

      // Check if already a member
      if (members.some((m) => m.userId === user.id)) {
        setInviteError('このユーザーはすでにメンバーです');
        return;
      }

      // Add member
      await addMember(user.id, inviteRole);
      setInviteEmail('');
      setInviteRole('editor');
      setInviteDialogOpen(false);
    } catch (error) {
      console.error('Failed to invite member:', error);
      setInviteError('招待に失敗しました');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>基本設定</CardTitle>
          <CardDescription>プロジェクトの基本情報を編集します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                    (icon || project.icon) === emoji
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
                    (color || project.color) === c.value
                      ? 'ring-2 ring-offset-2 ring-primary'
                      : 'hover:scale-110'
                  )}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">プロジェクト名</Label>
            <Input
              id="name"
              value={name || project.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="プロジェクト名"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={description || project.description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="プロジェクトの説明"
              rows={3}
            />
          </div>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存
          </Button>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle>メンバー</CardTitle>
          <CardDescription>
            プロジェクトのメンバーを管理します（{members.length}人）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => {
              const user = memberUsers.find((u) => u.id === member.userId);
              return (
                <div
                  key={member.userId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || ''} />
                      <AvatarFallback>
                        {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user?.displayName || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
                    </div>
                  </div>
                  <Badge variant={getRoleBadgeVariant(member.role) as "default" | "secondary" | "outline"}>
                    {getRoleLabel(member.role)}
                  </Badge>
                </div>
              );
            })}
          </div>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="mt-4">
                <UserPlus className="mr-2 h-4 w-4" />
                メンバーを招待
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>メンバーを招待</DialogTitle>
                <DialogDescription>
                  メールアドレスでユーザーを検索して招待します。
                  招待するユーザーは事前にログインしている必要があります。
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">メールアドレス</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="example@1000ri.jp"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>権限</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'editor' | 'viewer')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">編集者 - タスクの作成・編集が可能</SelectItem>
                      <SelectItem value="viewer">閲覧者 - 閲覧のみ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {inviteError && (
                  <p className="text-sm text-red-600">{inviteError}</p>
                )}
                <Button onClick={handleInvite} disabled={isInviting} className="w-full">
                  {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  招待する
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Separator />

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">危険な操作</CardTitle>
          <CardDescription>これらの操作は取り消せません</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">プロジェクトをアーカイブ</p>
              <p className="text-sm text-muted-foreground">
                プロジェクトを非表示にします
              </p>
            </div>
            <Button variant="outline">アーカイブ</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-600">プロジェクトを削除</p>
              <p className="text-sm text-muted-foreground">
                プロジェクトとすべてのデータが完全に削除されます
              </p>
            </div>
            <Button variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

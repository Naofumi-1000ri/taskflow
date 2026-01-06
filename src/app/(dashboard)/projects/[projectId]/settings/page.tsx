'use client';

import { useState, useEffect, useRef } from 'react';
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
import type { User, ProjectRole, ProjectUrl } from '@/types';
import { cn } from '@/lib/utils';
import { Loader2, Trash2, UserPlus, X, Upload, Link as LinkIcon, Plus, ExternalLink } from 'lucide-react';
import { getUsersByIds, getAllUsers } from '@/lib/firebase/firestore';
import { uploadProjectIcon, deleteProjectIcon } from '@/lib/firebase/storage';
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
  const { project, members, isLoading, update, addMember, removeMember, updateRole } = useProject(projectId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [icon, setIcon] = useState('');
  const [iconUrl, setIconUrl] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [memberUsers, setMemberUsers] = useState<User[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Project URLs state
  const [urls, setUrls] = useState<ProjectUrl[]>([]);
  const [newUrlTitle, setNewUrlTitle] = useState('');
  const [newUrlValue, setNewUrlValue] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);

  // Invite member state
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Initialize form when project loads
  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description);
      setColor(project.color);
      setIcon(project.icon);
      setIconUrl(project.iconUrl);
      setUrls(project.urls || []);
    }
  }, [project]);

  // Fetch member user details
  useEffect(() => {
    if (members.length > 0) {
      const userIds = members.map((m) => m.userId);
      getUsersByIds(userIds).then(setMemberUsers);
    }
  }, [members]);

  // Fetch all users for invite dialog
  useEffect(() => {
    getAllUsers().then(setAllUsers);
  }, []);

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
        iconUrl: iconUrl,
        urls: urls,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingIcon(true);
    try {
      const url = await uploadProjectIcon(projectId, file);
      setIconUrl(url);
      // Save immediately
      await update({ iconUrl: url });
    } catch (error) {
      console.error('Failed to upload icon:', error);
      alert(error instanceof Error ? error.message : 'アイコンのアップロードに失敗しました');
    } finally {
      setIsUploadingIcon(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveIcon = async () => {
    if (!iconUrl) return;
    if (!confirm('アイコン画像を削除しますか？')) return;

    try {
      await deleteProjectIcon(projectId, iconUrl);
      setIconUrl(undefined);
      await update({ iconUrl: undefined });
    } catch (error) {
      console.error('Failed to remove icon:', error);
    }
  };

  const handleAddUrl = async () => {
    if (!newUrlTitle.trim() || !newUrlValue.trim()) return;

    const newUrl: ProjectUrl = {
      id: Date.now().toString(),
      title: newUrlTitle.trim(),
      url: newUrlValue.trim(),
    };

    const newUrls = [...urls, newUrl];
    setUrls(newUrls);
    setNewUrlTitle('');
    setNewUrlValue('');
    setIsAddingUrl(false);
    await update({ urls: newUrls });
  };

  const handleRemoveUrl = async (urlId: string) => {
    const newUrls = urls.filter((u) => u.id !== urlId);
    setUrls(newUrls);
    await update({ urls: newUrls });
  };

  const handleInviteUser = async (userId: string) => {
    setIsInviting(true);
    try {
      await addMember(userId, inviteRole);
      setInviteDialogOpen(false);
    } catch (error) {
      console.error('Failed to invite member:', error);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: ProjectRole) => {
    try {
      await updateRole(userId, newRole);
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!confirm('このメンバーを削除しますか？')) return;
    try {
      await removeMember(memberId, userId);
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  // Get users not yet in the project
  const availableUsers = allUsers.filter(
    (user) => !members.some((m) => m.userId === user.id)
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl space-y-6 pb-8">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>基本設定</CardTitle>
            <CardDescription>プロジェクトの基本情報を編集します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Icon Selection */}
            <div className="space-y-3">
              <Label>アイコン</Label>

              {/* Custom Image Icon */}
              <div className="flex items-center gap-4">
                {iconUrl ? (
                  <div className="relative">
                    <img
                      src={iconUrl}
                      alt="プロジェクトアイコン"
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveIcon}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/50 hover:border-primary hover:bg-muted/50"
                  >
                    {isUploadingIcon ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  <p>画像をアップロード</p>
                  <p className="text-xs">JPG, PNG, GIF, WebP (最大5MB)</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleIconUpload}
                  className="hidden"
                />
              </div>

              {/* Emoji Icons (only show when no custom image) */}
              {!iconUrl && (
                <>
                  <div className="text-sm text-muted-foreground">または絵文字を選択</div>
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
                </>
              )}
            </div>

            {/* Color Selection (only show when no custom iconUrl) */}
            {!iconUrl && (
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
            )}

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
                const isOwner = member.role === 'admin';
                return (
                  <div
                    key={member.id}
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
                    <div className="flex items-center gap-2">
                      {isOwner ? (
                        <Badge>管理者</Badge>
                      ) : (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(v) => handleRoleChange(member.userId, v as ProjectRole)}
                          >
                            <SelectTrigger className="h-8 w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="editor">編集者</SelectItem>
                              <SelectItem value="viewer">閲覧者</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleRemoveMember(member.id, member.userId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
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
              <DialogContent className="max-h-[80vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>メンバーを招待</DialogTitle>
                  <DialogDescription>
                    招待するユーザーを選択してください
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
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
                  <div className="space-y-2">
                    <Label>ユーザーを選択</Label>
                    <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-2">
                      {availableUsers.length > 0 ? (
                        availableUsers.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => handleInviteUser(user.id)}
                            disabled={isInviting}
                            className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted disabled:opacity-50"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.photoURL || ''} alt={user.displayName} />
                              <AvatarFallback>
                                {user.displayName?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 overflow-hidden">
                              <p className="truncate text-sm font-medium">{user.displayName}</p>
                              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                          招待可能なユーザーがいません
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Project URLs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              関連URL
            </CardTitle>
            <CardDescription>
              プロジェクトに関連するURLを管理します
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {urls.map((urlItem) => (
                <div
                  key={urlItem.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="overflow-hidden">
                      <p className="truncate text-sm font-medium">{urlItem.title}</p>
                      <a
                        href={urlItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-xs text-blue-600 hover:underline"
                      >
                        {urlItem.url}
                      </a>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleRemoveUrl(urlItem.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {isAddingUrl ? (
                <div className="space-y-3 rounded-lg border p-3">
                  <Input
                    value={newUrlTitle}
                    onChange={(e) => setNewUrlTitle(e.target.value)}
                    placeholder="タイトル（例: デザインファイル）"
                    autoFocus
                  />
                  <Input
                    value={newUrlValue}
                    onChange={(e) => setNewUrlValue(e.target.value)}
                    placeholder="URL（例: https://figma.com/...）"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                        handleAddUrl();
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddUrl}>
                      追加
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsAddingUrl(false);
                        setNewUrlTitle('');
                        setNewUrlValue('');
                      }}
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsAddingUrl(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  URLを追加
                </Button>
              )}
            </div>
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
    </div>
  );
}

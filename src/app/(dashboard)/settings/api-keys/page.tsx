'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Key, Plus, Copy, Trash2, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import type { ApiKey, ApiKeyPermission, ApiKeyCreateData } from '@/types/apiKey';
import { PERMISSION_GROUPS } from '@/types/apiKey';
import { createApiKey, getUserApiKeys, deactivateApiKey, deleteApiKey } from '@/lib/firebase/apiKeys';

export default function ApiKeysPage() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<ApiKeyPermission[]>(['tasks:read']);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlainTextKey, setNewPlainTextKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user?.id) {
      loadApiKeys();
    }
  }, [user?.id]);

  const loadApiKeys = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const keys = await getUserApiKeys(user.id);
      setApiKeys(keys);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!user?.id || !newKeyName.trim()) return;

    setIsCreating(true);
    try {
      const data: ApiKeyCreateData = {
        name: newKeyName.trim(),
        permissions: selectedPermissions,
        projectIds: null, // All projects for now
        expiresAt: null, // Never expires for now
      };

      const { plainTextKey } = await createApiKey(user.id, data);
      setNewPlainTextKey(plainTextKey);
      await loadApiKeys();
    } catch (error) {
      console.error('Failed to create API key:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyKey = async () => {
    if (newPlainTextKey) {
      await navigator.clipboard.writeText(newPlainTextKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setNewKeyName('');
    setSelectedPermissions(['tasks:read']);
    setNewPlainTextKey(null);
    setCopiedKey(false);
  };

  const handleDeactivateKey = async (key: ApiKey) => {
    if (!user?.id) return;
    try {
      await deactivateApiKey(key.id, user.id);
      await loadApiKeys();
    } catch (error) {
      console.error('Failed to deactivate API key:', error);
    }
  };

  const handleDeleteKey = async () => {
    if (!user?.id || !keyToDelete) return;
    try {
      await deleteApiKey(keyToDelete.id, user.id);
      await loadApiKeys();
      setKeyToDelete(null);
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const togglePermission = (permission: ApiKeyPermission) => {
    setSelectedPermissions(prev => {
      // If selecting admin, clear others
      if (permission === 'admin') {
        return prev.includes('admin') ? [] : ['admin'];
      }
      // If admin is selected and selecting something else, remove admin
      if (prev.includes('admin')) {
        return [permission];
      }
      // Toggle the permission
      if (prev.includes(permission)) {
        return prev.filter(p => p !== permission);
      }
      return [...prev, permission];
    });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getPermissionLabel = (permission: ApiKeyPermission): string => {
    const labels: Record<ApiKeyPermission, string> = {
      'tasks:read': 'タスク閲覧',
      'tasks:write': 'タスク編集',
      'projects:read': 'プロジェクト閲覧',
      'projects:write': 'プロジェクト編集',
      'members:manage': 'メンバー管理',
      'admin': '全権限',
    };
    return labels[permission];
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">APIキー管理</h1>
          <p className="text-muted-foreground">外部のAIやツールからTaskFlowにアクセスするためのAPIキーを管理します</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                APIキー
              </CardTitle>
              <CardDescription>
                MCPサーバーやその他の外部ツールで使用するAPIキーです
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  新規作成
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                {newPlainTextKey ? (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        APIキーが作成されました
                      </DialogTitle>
                      <DialogDescription>
                        このキーは一度だけ表示されます。必ずコピーして安全な場所に保存してください。
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="rounded-lg bg-muted p-4">
                        <div className="flex items-center gap-2">
                          <code className="flex-1 break-all text-sm font-mono">
                            {newPlainTextKey}
                          </code>
                          <Button variant="outline" size="icon" onClick={handleCopyKey}>
                            {copiedKey ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                        <p className="text-sm">
                          このキーを他人と共有しないでください。キーが漏洩した場合は、すぐに無効化してください。
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCloseCreateDialog}>閉じる</Button>
                    </DialogFooter>
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle>新規APIキーを作成</DialogTitle>
                      <DialogDescription>
                        APIキーの名前と権限を設定してください
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="key-name">キー名</Label>
                        <Input
                          id="key-name"
                          placeholder="例: Claude Desktop用"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-3">
                        <Label>権限</Label>
                        {PERMISSION_GROUPS.map((group) => (
                          <div key={group.id} className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">{group.label}</p>
                            {group.permissions.map((perm) => (
                              <div key={perm.id} className="flex items-start gap-3 pl-2">
                                <Checkbox
                                  id={perm.id}
                                  checked={selectedPermissions.includes(perm.id)}
                                  onCheckedChange={() => togglePermission(perm.id)}
                                  disabled={perm.id !== 'admin' && selectedPermissions.includes('admin')}
                                />
                                <div className="grid gap-0.5 leading-none">
                                  <label
                                    htmlFor={perm.id}
                                    className="text-sm font-medium cursor-pointer"
                                  >
                                    {perm.label}
                                  </label>
                                  <p className="text-xs text-muted-foreground">
                                    {perm.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={handleCloseCreateDialog}>
                        キャンセル
                      </Button>
                      <Button
                        onClick={handleCreateKey}
                        disabled={!newKeyName.trim() || selectedPermissions.length === 0 || isCreating}
                      >
                        {isCreating ? '作成中...' : '作成'}
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">読み込み中...</div>
          ) : apiKeys.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Key className="mx-auto h-12 w-12 opacity-30" />
              <p className="mt-2">APIキーがありません</p>
              <p className="text-sm">新規作成ボタンからAPIキーを作成してください</p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className={`rounded-lg border p-4 ${!key.isActive ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{key.name}</span>
                        {!key.isActive && (
                          <Badge variant="secondary">無効</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm text-muted-foreground font-mono">
                          {showKeys[key.id] ? key.keyHash.substring(0, 20) + '...' : key.keyPrefix}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setShowKeys(prev => ({ ...prev, [key.id]: !prev[key.id] }))}
                        >
                          {showKeys[key.id] ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {key.permissions.map((perm) => (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {getPermissionLabel(perm)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {key.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeactivateKey(key)}
                        >
                          無効化
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setKeyToDelete(key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>作成: {formatDate(key.createdAt)}</span>
                    <span>最終使用: {formatDate(key.lastUsedAt)}</span>
                    {key.expiresAt && <span>有効期限: {formatDate(key.expiresAt)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>MCP サーバー設定</CardTitle>
          <CardDescription>
            Claude DesktopやCursorなどのMCPクライアントで使用する設定です
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground mb-2">
              MCPクライアントの設定ファイルに以下を追加してください:
            </p>
            <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
{`{
  "mcpServers": {
    "taskflow": {
      "command": "npx",
      "args": ["-y", "@taskflow/mcp-server"],
      "env": {
        "TASKFLOW_API_KEY": "your-api-key-here"
      }
    }
  }
}`}
            </pre>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!keyToDelete} onOpenChange={() => setKeyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>APIキーを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{keyToDelete?.name}」を削除します。この操作は取り消せません。
              このキーを使用しているすべてのアプリケーションは動作しなくなります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteKey}
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

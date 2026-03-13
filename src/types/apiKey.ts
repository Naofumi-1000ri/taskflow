// API Key types for MCP integration

export type ApiKeyPermission =
  | 'tasks:read'      // タスク閲覧
  | 'tasks:write'     // タスク作成・編集・削除
  | 'projects:read'   // プロジェクト閲覧
  | 'projects:write'  // プロジェクト作成・設定変更
  | 'members:manage'  // メンバー管理
  | 'admin';          // 全権限

export interface ApiKey {
  id: string;
  name: string;
  actorDisplayName: string | null;
  actorIcon: string | null;
  keyPrefix: string;           // First 8 chars for display (e.g., "tf_abc123...")
  keyHash: string;             // SHA-256 hash of full key
  userId: string;              // Owner user ID
  permissions: ApiKeyPermission[];
  projectIds: string[] | null; // null = all projects user has access to
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;      // null = never expires
  isActive: boolean;
}

export interface ApiKeyCreateData {
  name: string;
  actorDisplayName: string | null;
  actorIcon: string | null;
  permissions: ApiKeyPermission[];
  projectIds: string[] | null;
  expiresAt: Date | null;
}

// Permission groups for UI
export const PERMISSION_GROUPS = [
  {
    id: 'tasks',
    label: 'タスク',
    permissions: [
      { id: 'tasks:read' as const, label: '閲覧', description: 'タスクの一覧・詳細を取得' },
      { id: 'tasks:write' as const, label: '編集', description: 'タスクの作成・更新・削除' },
    ],
  },
  {
    id: 'projects',
    label: 'プロジェクト',
    permissions: [
      { id: 'projects:read' as const, label: '閲覧', description: 'プロジェクト情報を取得' },
      { id: 'projects:write' as const, label: '編集', description: 'プロジェクトの作成・設定変更' },
    ],
  },
  {
    id: 'members',
    label: 'メンバー',
    permissions: [
      { id: 'members:manage' as const, label: '管理', description: 'メンバーの追加・削除・権限変更' },
    ],
  },
  {
    id: 'admin',
    label: '管理者',
    permissions: [
      { id: 'admin' as const, label: '全権限', description: '全ての操作が可能（危険）' },
    ],
  },
] as const;

// Helper to check if a permission allows an action
export function hasPermission(
  userPermissions: ApiKeyPermission[],
  requiredPermission: ApiKeyPermission
): boolean {
  // Admin has all permissions
  if (userPermissions.includes('admin')) return true;

  // Check specific permission
  if (userPermissions.includes(requiredPermission)) return true;

  // Write permissions include read
  if (requiredPermission === 'tasks:read' && userPermissions.includes('tasks:write')) return true;
  if (requiredPermission === 'projects:read' && userPermissions.includes('projects:write')) return true;

  return false;
}

// Generate a secure API key
export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'tf_';
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

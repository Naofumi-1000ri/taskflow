import {
  getProjectLists,
  getProjectMembers,
  getProjectLabels,
  getProjectTasks,
  getUsersByIds,
} from '@/lib/firebase/firestore';
import { AITool, ToolHandler } from './types';

// ============================================
// get_lists - リスト一覧を取得
// ============================================

export interface GetListsArgs {
  // No arguments needed
}

export interface ListInfo {
  id: string;
  name: string;
  order: number;
  color: string | null;
  taskCount: number;
  completedCount: number;
}

export interface GetListsResult {
  lists: ListInfo[];
  count: number;
}

export const getListsToolDefinition: AITool = {
  name: 'get_lists',
  description:
    'プロジェクト内のリスト（カラム）一覧を取得します。リストは左から右の順序（order）で並んでいます。「一番左のリスト」「Doneリスト」などを特定する際に使用してください。',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export const getListsHandler: ToolHandler<GetListsArgs, GetListsResult> = async (
  _args,
  context
) => {
  const { projectId } = context;

  const [lists, tasks] = await Promise.all([
    getProjectLists(projectId),
    getProjectTasks(projectId),
  ]);

  const listInfos: ListInfo[] = lists.map((list) => {
    const listTasks = tasks.filter((t) => t.listId === list.id);
    return {
      id: list.id,
      name: list.name,
      order: list.order,
      color: list.color || null,
      taskCount: listTasks.length,
      completedCount: listTasks.filter((t) => t.isCompleted).length,
    };
  });

  return {
    lists: listInfos,
    count: listInfos.length,
  };
};

// ============================================
// get_members - メンバー一覧を取得
// ============================================

export interface GetMembersArgs {
  // No arguments needed
}

export interface MemberInfo {
  id: string;
  displayName: string;
  email: string;
  role: string;
  photoURL: string | null;
}

export interface GetMembersResult {
  members: MemberInfo[];
  count: number;
}

export const getMembersToolDefinition: AITool = {
  name: 'get_members',
  description:
    'プロジェクトのメンバー一覧を取得します。タスクに担当者を割り当てる際のユーザーID確認に使用してください。',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export const getMembersHandler: ToolHandler<GetMembersArgs, GetMembersResult> = async (
  _args,
  context
) => {
  const { projectId } = context;

  const projectMembers = await getProjectMembers(projectId);
  if (projectMembers.length === 0) {
    return { members: [], count: 0 };
  }

  const users = await getUsersByIds(projectMembers.map((m) => m.userId));

  const memberInfos: MemberInfo[] = projectMembers.map((member) => {
    const user = users.find((u) => u.id === member.userId);
    return {
      id: member.userId,
      displayName: user?.displayName || '不明',
      email: user?.email || '',
      role: member.role,
      photoURL: user?.photoURL || null,
    };
  });

  return {
    members: memberInfos,
    count: memberInfos.length,
  };
};

// ============================================
// get_labels - ラベル一覧を取得
// ============================================

export interface GetLabelsArgs {
  // No arguments needed
}

export interface LabelInfo {
  id: string;
  name: string;
  color: string;
}

export interface GetLabelsResult {
  labels: LabelInfo[];
  count: number;
}

export const getLabelsToolDefinition: AITool = {
  name: 'get_labels',
  description:
    'プロジェクトのラベル一覧を取得します。タスクにラベルを付ける際のラベルID確認に使用してください。',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export const getLabelsHandler: ToolHandler<GetLabelsArgs, GetLabelsResult> = async (
  _args,
  context
) => {
  const { projectId } = context;

  const labels = await getProjectLabels(projectId);

  const labelInfos: LabelInfo[] = labels.map((label) => ({
    id: label.id,
    name: label.name,
    color: label.color,
  }));

  return {
    labels: labelInfos,
    count: labelInfos.length,
  };
};

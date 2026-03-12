import type { ApiKeyPermission } from '@/types/apiKey';
import type { ProjectRole } from '@/types';
import { getAdminDb } from '@/lib/firebase/admin';

export interface ProjectAccess {
  role: ProjectRole;
}

function hasPermission(
  permissions: ApiKeyPermission[] | null,
  required: ApiKeyPermission
): boolean {
  if (permissions === null) {
    return true;
  }

  if (permissions.includes('admin') || permissions.includes(required)) {
    return true;
  }

  if (required === 'projects:read' && permissions.includes('projects:write')) {
    return true;
  }

  return false;
}

export async function getProjectAccess(
  userId: string,
  projectId: string,
  permissions: ApiKeyPermission[] | null,
  allowedProjectIds: string[] | null,
  requiredPermission: ApiKeyPermission
): Promise<ProjectAccess> {
  if (!hasPermission(permissions, requiredPermission)) {
    throw new Error('FORBIDDEN');
  }

  if (Array.isArray(allowedProjectIds) && !allowedProjectIds.includes(projectId)) {
    throw new Error('FORBIDDEN');
  }

  const db = getAdminDb();
  const projectRef = db.collection('projects').doc(projectId);
  const [projectSnapshot, membersSnapshot] = await Promise.all([
    projectRef.get(),
    projectRef.collection('members').where('userId', '==', userId).limit(1).get(),
  ]);

  if (!projectSnapshot.exists) {
    throw new Error('NOT_FOUND');
  }

  const projectData = projectSnapshot.data();
  const memberIds = Array.isArray(projectData?.memberIds) ? projectData.memberIds : [];
  if (!memberIds.includes(userId) || membersSnapshot.empty) {
    throw new Error('FORBIDDEN');
  }

  const role = membersSnapshot.docs[0].data().role as ProjectRole | undefined;
  if (role !== 'viewer' && role !== 'editor' && role !== 'admin') {
    throw new Error('FORBIDDEN');
  }

  if ((requiredPermission === 'projects:write' || requiredPermission === 'tasks:write') && role === 'viewer') {
    throw new Error('FORBIDDEN');
  }

  if (requiredPermission === 'members:manage' && role !== 'admin') {
    throw new Error('FORBIDDEN');
  }

  return { role };
}

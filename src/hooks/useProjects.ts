'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  createProject,
  getProject,
  subscribeToProject,
  updateProject,
  deleteProject,
  archiveProject,
  subscribeToUserProjects,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  updateMemberRole,
} from '@/lib/firebase/firestore';
import type { Project, ProjectMember, ProjectRole, ProjectUrl } from '@/types';

export function useProjects() {
  const { firebaseUser } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Subscribe to user's projects
  useEffect(() => {
    if (!firebaseUser) {
      Promise.resolve().then(() => {
        setProjects([]);
        setIsLoading(false);
      });
      return;
    }

    Promise.resolve().then(() => {
      setIsLoading(true);
      setError(null);
    });
    const unsubscribe = subscribeToUserProjects(
      firebaseUser.uid,
      (projects) => {
        setProjects(projects);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[useProjects] Error:', err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser]);

  // Create project
  const create = useCallback(
    async (data: { name: string; description: string; color: string; icon: string }) => {
      if (!firebaseUser) throw new Error('Not authenticated');

      try {
        const projectId = await createProject(
          {
            name: data.name,
            description: data.description,
            color: data.color,
            icon: data.icon,
            ownerId: firebaseUser.uid,
            memberIds: [firebaseUser.uid],
            isArchived: false,
          },
          firebaseUser.uid
        );
        return projectId;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [firebaseUser]
  );

  // Update project
  const update = useCallback(
    async (
      projectId: string,
      data: Partial<{ name: string; description: string; color: string; icon: string; iconUrl?: string; headerImageUrl?: string; urls?: ProjectUrl[] }>
    ) => {
      try {
        await updateProject(projectId, data);
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  // Delete project
  const remove = useCallback(async (projectId: string) => {
    try {
      await deleteProject(projectId);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  // Archive project
  const archive = useCallback(async (projectId: string, isArchived: boolean) => {
    try {
      await archiveProject(projectId, isArchived);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  return {
    projects,
    isLoading,
    error,
    create,
    update,
    remove,
    archive,
  };
}

export function useProject(projectId: string | null) {
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Subscribe to project for real-time updates
  useEffect(() => {
    if (!projectId) {
      Promise.resolve().then(() => {
        setProject(null);
        setMembers([]);
        setIsLoading(false);
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    // Fetch members (one-time)
    getProjectMembers(projectId)
      .then(setMembers)
      .catch((err) => console.error('[useProject] Error fetching members:', err));

    // Subscribe to project for real-time updates
    const unsubscribe = subscribeToProject(
      projectId,
      (projectData) => {
        setProject(projectData);
        setIsLoading(false);
      },
      (err) => {
        console.error('[useProject] Error:', err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [projectId]);

  // Update project (real-time subscription will handle state updates)
  const update = useCallback(
    async (data: Partial<{ name: string; description: string; color: string; icon: string; iconUrl?: string | null; headerImageUrl?: string | null; urls?: ProjectUrl[] }>) => {
      if (!projectId) return;
      try {
        await updateProject(projectId, data);
        // State will be automatically updated via subscribeToProject
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [projectId]
  );

  // Add member
  const addMember = useCallback(
    async (userId: string, role: ProjectRole) => {
      if (!projectId) return;
      try {
        await addProjectMember(projectId, userId, role);
        const updatedMembers = await getProjectMembers(projectId);
        setMembers(updatedMembers);
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [projectId]
  );

  // Remove member
  const removeMember = useCallback(
    async (memberId: string, userId: string) => {
      if (!projectId) return;
      try {
        await removeProjectMember(projectId, memberId, userId);
        setMembers((prev) => prev.filter((m) => m.userId !== userId));
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [projectId]
  );

  // Update member role
  const updateRole = useCallback(
    async (memberId: string, role: ProjectRole) => {
      if (!projectId) return;
      try {
        await updateMemberRole(projectId, memberId, role);
        setMembers((prev) =>
          prev.map((m) => (m.userId === memberId ? { ...m, role } : m))
        );
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [projectId]
  );

  return {
    project,
    members,
    isLoading,
    error,
    update,
    addMember,
    removeMember,
    updateRole,
  };
}

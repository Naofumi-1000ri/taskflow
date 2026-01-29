'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  createActivityLog,
  subscribeToActivityLogs,
} from '@/lib/firebase/firestore';
import type {
  ActivityLog,
  ActivityTargetType,
  ActivityAction,
  ActivityChange,
} from '@/types';

interface UseActivityLogReturn {
  logs: ActivityLog[];
  isLoading: boolean;
  logActivity: (params: {
    targetType: ActivityTargetType;
    targetId: string;
    targetName: string;
    action: ActivityAction;
    changes?: ActivityChange[];
  }) => Promise<void>;
}

export function useActivityLog(projectId: string | null): UseActivityLogReturn {
  const { firebaseUser, user } = useAuthStore();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setLogs([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToActivityLogs(projectId, (activityLogs) => {
      setLogs(activityLogs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  const logActivity = useCallback(
    async (params: {
      targetType: ActivityTargetType;
      targetId: string;
      targetName: string;
      action: ActivityAction;
      changes?: ActivityChange[];
    }) => {
      if (!projectId || !firebaseUser) return;

      await createActivityLog(projectId, {
        projectId,
        targetType: params.targetType,
        targetId: params.targetId,
        targetName: params.targetName,
        action: params.action,
        userId: firebaseUser.uid,
        userName: user?.displayName || 'Unknown',
        changes: params.changes,
      });
    },
    [projectId, firebaseUser, user]
  );

  return { logs, isLoading, logActivity };
}

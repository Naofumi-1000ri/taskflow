'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  subscribeToUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  createNotification,
  getProjectMembers,
} from '@/lib/firebase/firestore';
import { useAuthStore } from '@/stores/authStore';
import type { Notification } from '@/types';

export function useNotifications() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to notifications
  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    const unsubscribe = subscribeToUserNotifications(user.id, (notifs) => {
      setNotifications(notifs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // Get unread count
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (user?.id) {
      await markAllNotificationsAsRead(user.id);
    }
  }, [user?.id]);

  // Delete notification
  const remove = useCallback(async (notificationId: string) => {
    await deleteNotification(notificationId);
  }, []);

  // Send bell notification to project members
  const sendBellNotification = useCallback(
    async (
      projectId: string,
      projectName: string,
      taskId: string,
      taskName: string,
      message: string
    ) => {
      if (!user) return;

      // Get all project members
      const members = await getProjectMembers(projectId);

      // Create notification for all members (including sender for confirmation)
      const promises = members.map((member) =>
          createNotification({
            userId: member.userId,
            type: 'task_bell',
            title: `${user.displayName || 'ユーザー'}からのメッセージ`,
            message: message || `${taskName}へのアサイン`,
            projectId,
            projectName,
            taskId,
            taskName,
            senderId: user.id,
            senderName: user.displayName || 'ユーザー',
            isRead: false,
            data: {},
          })
        );

      await Promise.all(promises);
    },
    [user]
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    remove,
    sendBellNotification,
  };
}

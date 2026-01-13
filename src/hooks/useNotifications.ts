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
      console.log('[Notifications] No user id, skipping subscription');
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    console.log('[Notifications] Subscribing for user:', user.id);
    const unsubscribe = subscribeToUserNotifications(user.id, (notifs) => {
      console.log('[Notifications] Received notifications:', notifs.length, notifs);
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
      console.log('[Notifications] Sending to members:', members.map(m => m.userId));
      console.log('[Notifications] Current user id:', user.id);

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

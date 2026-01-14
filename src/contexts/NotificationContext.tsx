'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  subscribeToUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  createNotification,
} from '@/lib/firebase/firestore';
import { useAuthStore } from '@/stores/authStore';
import type { Notification } from '@/types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  remove: (notificationId: string) => Promise<void>;
  sendBellNotification: (
    projectId: string,
    projectName: string,
    taskId: string,
    taskName: string,
    message: string,
    assigneeIds: string[]
  ) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to notifications (only once per user)
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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = useCallback(async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (user?.id) {
      await markAllNotificationsAsRead(user.id);
    }
  }, [user?.id]);

  const remove = useCallback(async (notificationId: string) => {
    await deleteNotification(notificationId);
  }, []);

  const sendBellNotification = useCallback(
    async (
      projectId: string,
      projectName: string,
      taskId: string,
      taskName: string,
      message: string,
      assigneeIds: string[]
    ) => {
      if (!user) return;

      // Include sender in notification recipients for confirmation
      const recipientIds = [...new Set([...assigneeIds, user.id])];

      const promises = recipientIds.map((userId) =>
        createNotification({
          userId,
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

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        remove,
        sendBellNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

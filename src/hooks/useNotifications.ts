// Re-export from NotificationContext for centralized state management
// This ensures only one Firestore subscription is created for all components
export { useNotifications } from '@/contexts/NotificationContext';

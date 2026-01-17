import { create } from 'zustand';

interface UIState {
  // Sidebar state
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  // Modal states
  isTaskModalOpen: boolean;
  selectedTaskId: string | null;
  isProjectModalOpen: boolean;
  selectedProjectId: string | null;
  // AI Panel state
  isAIPanelOpen: boolean;
  selectedConversationId: string | null;
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openTaskModal: (taskId?: string) => void;
  closeTaskModal: () => void;
  openProjectModal: (projectId?: string) => void;
  closeProjectModal: () => void;
  // AI Panel actions
  openAIPanel: () => void;
  closeAIPanel: () => void;
  setSelectedConversationId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  isSidebarCollapsed: false,
  isTaskModalOpen: false,
  selectedTaskId: null,
  isProjectModalOpen: false,
  selectedProjectId: null,
  isAIPanelOpen: false,
  selectedConversationId: null,

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),

  setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),

  openTaskModal: (taskId) =>
    set({ isTaskModalOpen: true, selectedTaskId: taskId || null }),

  closeTaskModal: () =>
    set({ isTaskModalOpen: false, selectedTaskId: null }),

  openProjectModal: (projectId) =>
    set({ isProjectModalOpen: true, selectedProjectId: projectId || null }),

  closeProjectModal: () =>
    set({ isProjectModalOpen: false, selectedProjectId: null }),

  openAIPanel: () => set({ isAIPanelOpen: true }),

  closeAIPanel: () =>
    set({ isAIPanelOpen: false, selectedConversationId: null }),

  setSelectedConversationId: (selectedConversationId) =>
    set({ selectedConversationId }),
}));

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
  // Command palette state
  isCommandPaletteOpen: boolean;
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openTaskModal: (taskId?: string) => void;
  closeTaskModal: () => void;
  openProjectModal: (projectId?: string) => void;
  closeProjectModal: () => void;
  // Command palette actions
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  isSidebarCollapsed: false,
  isTaskModalOpen: false,
  selectedTaskId: null,
  isProjectModalOpen: false,
  selectedProjectId: null,
  isCommandPaletteOpen: false,

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

  openCommandPalette: () => set({ isCommandPaletteOpen: true }),

  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
}));

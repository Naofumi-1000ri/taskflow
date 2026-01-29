import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useUIStore.setState({
      isSidebarOpen: true,
      isSidebarCollapsed: false,
      isTaskModalOpen: false,
      selectedTaskId: null,
      isProjectModalOpen: false,
      selectedProjectId: null,
      isCommandPaletteOpen: false,
    });
  });

  describe('sidebar', () => {
    it('should toggle sidebar open state', () => {
      const store = useUIStore.getState();
      expect(store.isSidebarOpen).toBe(true);

      store.toggleSidebar();
      expect(useUIStore.getState().isSidebarOpen).toBe(false);

      store.toggleSidebar();
      expect(useUIStore.getState().isSidebarOpen).toBe(true);
    });

    it('should set sidebar open directly', () => {
      useUIStore.getState().setSidebarOpen(false);
      expect(useUIStore.getState().isSidebarOpen).toBe(false);
    });

    it('should set sidebar collapsed state', () => {
      useUIStore.getState().setSidebarCollapsed(true);
      expect(useUIStore.getState().isSidebarCollapsed).toBe(true);
    });
  });

  describe('task modal', () => {
    it('should open task modal without taskId', () => {
      useUIStore.getState().openTaskModal();
      const state = useUIStore.getState();
      expect(state.isTaskModalOpen).toBe(true);
      expect(state.selectedTaskId).toBeNull();
    });

    it('should open task modal with taskId', () => {
      useUIStore.getState().openTaskModal('task-123');
      const state = useUIStore.getState();
      expect(state.isTaskModalOpen).toBe(true);
      expect(state.selectedTaskId).toBe('task-123');
    });

    it('should close task modal and clear taskId', () => {
      useUIStore.getState().openTaskModal('task-123');
      useUIStore.getState().closeTaskModal();
      const state = useUIStore.getState();
      expect(state.isTaskModalOpen).toBe(false);
      expect(state.selectedTaskId).toBeNull();
    });
  });

  describe('project modal', () => {
    it('should open project modal without projectId', () => {
      useUIStore.getState().openProjectModal();
      const state = useUIStore.getState();
      expect(state.isProjectModalOpen).toBe(true);
      expect(state.selectedProjectId).toBeNull();
    });

    it('should open project modal with projectId', () => {
      useUIStore.getState().openProjectModal('proj-456');
      const state = useUIStore.getState();
      expect(state.isProjectModalOpen).toBe(true);
      expect(state.selectedProjectId).toBe('proj-456');
    });

    it('should close project modal and clear projectId', () => {
      useUIStore.getState().openProjectModal('proj-456');
      useUIStore.getState().closeProjectModal();
      const state = useUIStore.getState();
      expect(state.isProjectModalOpen).toBe(false);
      expect(state.selectedProjectId).toBeNull();
    });
  });

  describe('command palette', () => {
    it('should start closed', () => {
      expect(useUIStore.getState().isCommandPaletteOpen).toBe(false);
    });

    it('should open command palette', () => {
      useUIStore.getState().openCommandPalette();
      expect(useUIStore.getState().isCommandPaletteOpen).toBe(true);
    });

    it('should close command palette', () => {
      useUIStore.getState().openCommandPalette();
      useUIStore.getState().closeCommandPalette();
      expect(useUIStore.getState().isCommandPaletteOpen).toBe(false);
    });
  });

});

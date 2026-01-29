import { create } from 'zustand';

export interface UndoableAction {
  id: string;
  description: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

interface ToastState {
  message: string;
  actionId: string;
  type: 'undo' | 'redo';
}

interface UndoState {
  undoStack: UndoableAction[];
  redoStack: UndoableAction[];
  toast: ToastState | null;
  toastTimeoutId: ReturnType<typeof setTimeout> | null;
  // Actions
  pushAction: (action: UndoableAction) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: () => boolean;
  canRedo: () => boolean;
  dismissToast: () => void;
}

const MAX_STACK_SIZE = 30;

export const useUndoStore = create<UndoState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  toast: null,
  toastTimeoutId: null,

  pushAction: (action) => {
    set((state) => ({
      undoStack: [...state.undoStack.slice(-MAX_STACK_SIZE + 1), action],
      redoStack: [],
    }));
  },

  undo: async () => {
    const { undoStack, toastTimeoutId } = get();
    if (undoStack.length === 0) return;

    const action = undoStack[undoStack.length - 1];
    try {
      await action.undo();
      if (toastTimeoutId) clearTimeout(toastTimeoutId);
      const timeoutId = setTimeout(() => {
        set({ toast: null, toastTimeoutId: null });
      }, 4000);
      set((state) => ({
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, action],
        toast: { message: action.description, actionId: action.id, type: 'undo' },
        toastTimeoutId: timeoutId,
      }));
    } catch (error) {
      console.error('Undo failed:', error);
    }
  },

  redo: async () => {
    const { redoStack, toastTimeoutId } = get();
    if (redoStack.length === 0) return;

    const action = redoStack[redoStack.length - 1];
    try {
      await action.redo();
      if (toastTimeoutId) clearTimeout(toastTimeoutId);
      const timeoutId = setTimeout(() => {
        set({ toast: null, toastTimeoutId: null });
      }, 4000);
      set((state) => ({
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, action],
        toast: { message: action.description, actionId: action.id, type: 'redo' },
        toastTimeoutId: timeoutId,
      }));
    } catch (error) {
      console.error('Redo failed:', error);
    }
  },

  canUndo: () => get().undoStack.length > 0,

  canRedo: () => get().redoStack.length > 0,

  dismissToast: () => {
    const { toastTimeoutId } = get();
    if (toastTimeoutId) clearTimeout(toastTimeoutId);
    set({ toast: null, toastTimeoutId: null });
  },
}));

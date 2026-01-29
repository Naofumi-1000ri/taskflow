import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUndoStore } from './undoStore';

describe('undoStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useUndoStore.setState({
      undoStack: [],
      redoStack: [],
      toast: null,
      toastTimeoutId: null,
    });
  });

  it('should start with empty stacks', () => {
    const state = useUndoStore.getState();
    expect(state.undoStack).toHaveLength(0);
    expect(state.redoStack).toHaveLength(0);
    expect(state.canUndo()).toBe(false);
    expect(state.canRedo()).toBe(false);
  });

  it('should push an action to the undo stack', () => {
    const action = {
      id: 'test-1',
      description: 'Test action',
      undo: vi.fn().mockResolvedValue(undefined),
      redo: vi.fn().mockResolvedValue(undefined),
    };

    useUndoStore.getState().pushAction(action);

    const state = useUndoStore.getState();
    expect(state.undoStack).toHaveLength(1);
    expect(state.canUndo()).toBe(true);
    expect(state.canRedo()).toBe(false);
  });

  it('should clear redo stack when pushing a new action', () => {
    const action1 = {
      id: 'test-1',
      description: 'Action 1',
      undo: vi.fn().mockResolvedValue(undefined),
      redo: vi.fn().mockResolvedValue(undefined),
    };
    const action2 = {
      id: 'test-2',
      description: 'Action 2',
      undo: vi.fn().mockResolvedValue(undefined),
      redo: vi.fn().mockResolvedValue(undefined),
    };

    // Push and undo to put action1 in redo stack
    useUndoStore.getState().pushAction(action1);
    // Manually set redo stack to simulate undo
    useUndoStore.setState({ redoStack: [action1], undoStack: [] });

    expect(useUndoStore.getState().canRedo()).toBe(true);

    // Push new action should clear redo stack
    useUndoStore.getState().pushAction(action2);

    const state = useUndoStore.getState();
    expect(state.redoStack).toHaveLength(0);
    expect(state.undoStack).toHaveLength(1);
    expect(state.undoStack[0].id).toBe('test-2');
  });

  it('should undo the last action', async () => {
    const undoFn = vi.fn().mockResolvedValue(undefined);
    const action = {
      id: 'test-1',
      description: 'Test action',
      undo: undoFn,
      redo: vi.fn().mockResolvedValue(undefined),
    };

    useUndoStore.getState().pushAction(action);
    await useUndoStore.getState().undo();

    expect(undoFn).toHaveBeenCalledOnce();
    const state = useUndoStore.getState();
    expect(state.undoStack).toHaveLength(0);
    expect(state.redoStack).toHaveLength(1);
    expect(state.canUndo()).toBe(false);
    expect(state.canRedo()).toBe(true);
  });

  it('should redo the last undone action', async () => {
    const redoFn = vi.fn().mockResolvedValue(undefined);
    const action = {
      id: 'test-1',
      description: 'Test action',
      undo: vi.fn().mockResolvedValue(undefined),
      redo: redoFn,
    };

    useUndoStore.getState().pushAction(action);
    await useUndoStore.getState().undo();
    await useUndoStore.getState().redo();

    expect(redoFn).toHaveBeenCalledOnce();
    const state = useUndoStore.getState();
    expect(state.undoStack).toHaveLength(1);
    expect(state.redoStack).toHaveLength(0);
  });

  it('should show toast on undo', async () => {
    const action = {
      id: 'test-1',
      description: 'Moved task',
      undo: vi.fn().mockResolvedValue(undefined),
      redo: vi.fn().mockResolvedValue(undefined),
    };

    useUndoStore.getState().pushAction(action);
    await useUndoStore.getState().undo();

    const state = useUndoStore.getState();
    expect(state.toast).not.toBeNull();
    expect(state.toast?.message).toBe('Moved task');
    expect(state.toast?.type).toBe('undo');
  });

  it('should show toast on redo', async () => {
    const action = {
      id: 'test-1',
      description: 'Moved task',
      undo: vi.fn().mockResolvedValue(undefined),
      redo: vi.fn().mockResolvedValue(undefined),
    };

    useUndoStore.getState().pushAction(action);
    await useUndoStore.getState().undo();
    await useUndoStore.getState().redo();

    const state = useUndoStore.getState();
    expect(state.toast).not.toBeNull();
    expect(state.toast?.type).toBe('redo');
  });

  it('should dismiss toast', async () => {
    const action = {
      id: 'test-1',
      description: 'Test',
      undo: vi.fn().mockResolvedValue(undefined),
      redo: vi.fn().mockResolvedValue(undefined),
    };

    useUndoStore.getState().pushAction(action);
    await useUndoStore.getState().undo();
    expect(useUndoStore.getState().toast).not.toBeNull();

    useUndoStore.getState().dismissToast();
    expect(useUndoStore.getState().toast).toBeNull();
  });

  it('should do nothing when undo is called on empty stack', async () => {
    await useUndoStore.getState().undo();
    const state = useUndoStore.getState();
    expect(state.undoStack).toHaveLength(0);
    expect(state.redoStack).toHaveLength(0);
    expect(state.toast).toBeNull();
  });

  it('should do nothing when redo is called on empty stack', async () => {
    await useUndoStore.getState().redo();
    const state = useUndoStore.getState();
    expect(state.undoStack).toHaveLength(0);
    expect(state.redoStack).toHaveLength(0);
    expect(state.toast).toBeNull();
  });

  it('should limit undo stack size to 30', () => {
    for (let i = 0; i < 35; i++) {
      useUndoStore.getState().pushAction({
        id: `test-${i}`,
        description: `Action ${i}`,
        undo: vi.fn().mockResolvedValue(undefined),
        redo: vi.fn().mockResolvedValue(undefined),
      });
    }

    const state = useUndoStore.getState();
    expect(state.undoStack).toHaveLength(30);
    // Oldest actions should be dropped
    expect(state.undoStack[0].id).toBe('test-5');
    expect(state.undoStack[29].id).toBe('test-34');
  });

  it('should handle undo failure gracefully', async () => {
    const action = {
      id: 'test-1',
      description: 'Failing action',
      undo: vi.fn().mockRejectedValue(new Error('Failed')),
      redo: vi.fn().mockResolvedValue(undefined),
    };

    useUndoStore.getState().pushAction(action);
    await useUndoStore.getState().undo();

    // Action should still be in undo stack since it failed
    const state = useUndoStore.getState();
    expect(state.undoStack).toHaveLength(1);
    expect(state.redoStack).toHaveLength(0);
  });

  it('should support multiple undo/redo cycles', async () => {
    const actions = Array.from({ length: 3 }, (_, i) => ({
      id: `test-${i}`,
      description: `Action ${i}`,
      undo: vi.fn().mockResolvedValue(undefined),
      redo: vi.fn().mockResolvedValue(undefined),
    }));

    // Push all actions
    actions.forEach((a) => useUndoStore.getState().pushAction(a));
    expect(useUndoStore.getState().undoStack).toHaveLength(3);

    // Undo all
    await useUndoStore.getState().undo();
    await useUndoStore.getState().undo();
    await useUndoStore.getState().undo();

    expect(useUndoStore.getState().undoStack).toHaveLength(0);
    expect(useUndoStore.getState().redoStack).toHaveLength(3);

    // Redo all
    await useUndoStore.getState().redo();
    await useUndoStore.getState().redo();
    await useUndoStore.getState().redo();

    expect(useUndoStore.getState().undoStack).toHaveLength(3);
    expect(useUndoStore.getState().redoStack).toHaveLength(0);
  });
});

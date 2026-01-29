'use client';

import { useEffect, useState } from 'react';
import { useUndoStore } from '@/stores/undoStore';
import { Undo2, Redo2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function UndoToast() {
  const { toast, undo, redo, canUndo, canRedo, dismissToast } = useUndoStore();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      // Small delay for enter animation
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [toast]);

  if (!toast) return null;

  const isUndoType = toast.type === 'undo';

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-200',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      )}
    >
      <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg">
        <div className={cn('flex h-6 w-6 items-center justify-center rounded-full', isUndoType ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600')}>
          {isUndoType ? <Undo2 className="h-3 w-3" /> : <Redo2 className="h-3 w-3" />}
        </div>
        <span className="text-sm">
          {isUndoType ? '取り消し' : 'やり直し'}: {toast.message}
        </span>
        {/* Show opposite action button */}
        {isUndoType && canRedo() && (
          <button
            type="button"
            onClick={() => redo()}
            className="ml-2 rounded-md border px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
          >
            やり直し
          </button>
        )}
        {!isUndoType && canUndo() && (
          <button
            type="button"
            onClick={() => undo()}
            className="ml-2 rounded-md border px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50"
          >
            取り消し
          </button>
        )}
        <button
          type="button"
          onClick={dismissToast}
          className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

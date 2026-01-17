'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HOTKEY_DEFINITIONS } from '@/hooks/useHotkeys';

interface ShortcutHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutHelpModal({ isOpen, onClose }: ShortcutHelpModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>キーボードショートカット</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            {HOTKEY_DEFINITIONS.map((hotkey) => (
              <div
                key={hotkey.key}
                className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
              >
                <span className="text-sm">{hotkey.description}</span>
                <kbd className="rounded bg-muted px-2 py-1 font-mono text-sm font-medium">
                  {hotkey.label}
                </kbd>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Esc でこのダイアログを閉じる
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

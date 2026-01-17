'use client';

import { useEffect, useCallback } from 'react';

type HotkeyCallback = (event: KeyboardEvent) => void;

interface HotkeyConfig {
  key: string;
  callback: HotkeyCallback;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  preventDefault?: boolean;
}

export function useHotkeys(hotkeys: HotkeyConfig[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape key to work even in input fields
        if (event.key !== 'Escape') {
          return;
        }
      }

      for (const hotkey of hotkeys) {
        const keyMatches = event.key.toLowerCase() === hotkey.key.toLowerCase();
        const ctrlMatches = hotkey.ctrlKey ? event.ctrlKey : !event.ctrlKey;
        const metaMatches = hotkey.metaKey ? event.metaKey : !event.metaKey;
        const shiftMatches = hotkey.shiftKey ? event.shiftKey : !event.shiftKey;
        const altMatches = hotkey.altKey ? event.altKey : !event.altKey;

        if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
          if (hotkey.preventDefault !== false) {
            event.preventDefault();
          }
          hotkey.callback(event);
          return;
        }
      }
    },
    [hotkeys]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

// Preset hotkey definitions
export const HOTKEY_DEFINITIONS = [
  { key: 'n', label: 'N', description: '新規タスクを作成' },
  { key: 'Escape', label: 'Esc', description: 'モーダルを閉じる' },
  { key: '/', label: '/', description: '検索にフォーカス' },
  { key: '?', label: '?', description: 'ショートカット一覧を表示', shiftKey: true },
] as const;

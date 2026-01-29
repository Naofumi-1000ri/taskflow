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
      const isInInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isInInput) {
        // Allow Escape and modifier-key shortcuts (e.g. ⌘K) in input fields
        const hasModifier = event.ctrlKey || event.metaKey;
        if (event.key !== 'Escape' && !hasModifier) {
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
  { key: 'k', label: '⌘K', description: 'コマンドパレットを開く', metaKey: true },
  { key: 'z', label: '⌘Z', description: '操作を取り消す', metaKey: true },
  { key: 'z', label: '⌘⇧Z', description: '操作をやり直す', metaKey: true, shiftKey: true },
  { key: 'n', label: 'N', description: '新規タスクを作成' },
  { key: 'Escape', label: 'Esc', description: 'モーダルを閉じる' },
  { key: '/', label: '/', description: '検索にフォーカス' },
  { key: '?', label: '?', description: 'ショートカット一覧を表示', shiftKey: true },
] as const;

import { useEffect } from 'react';

export interface GlobalShortcutHandlers {
  findOpen: boolean
  shortcutsOpen: boolean
  setFindOpen: (open: boolean) => void
  setShortcutsOpen: (open: boolean | ((prev: boolean) => boolean)) => void
}

export function useGlobalShortcuts({
    findOpen,
    shortcutsOpen,
    setFindOpen,
    setShortcutsOpen,
}: GlobalShortcutHandlers): void {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const mod = e.ctrlKey || e.metaKey;
            if (mod && e.key === 'f') {
                e.preventDefault();
                setFindOpen(true);
            } else if (mod && e.key === '/') {
                e.preventDefault();
                setShortcutsOpen((prev) => !prev);
            } else if (e.key === 'Escape') {
                if (findOpen) setFindOpen(false);
                else if (shortcutsOpen) setShortcutsOpen(false);
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [findOpen, shortcutsOpen, setFindOpen, setShortcutsOpen]);
}

import { useEffect } from 'react';

import { useSessionStore } from '@/containers/editor/SessionStoreProvider';

/**
 * Global keyboard shortcuts for the editor shell. Reads/writes the per-session
 * UI store directly — Wave 3 / T-43 collapsed the four-setter parameter bag
 * down to nothing.
 *
 * Bindings:
 *  - Cmd/Ctrl + F     → open find
 *  - Cmd/Ctrl + /     → toggle shortcuts modal
 *  - Escape           → close find first, otherwise close shortcuts
 */
export function useDocumentKeyDown(): void {
    const store = useSessionStore();
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const mod = e.ctrlKey || e.metaKey;
            const state = store.getState();
            if (mod && e.key === 'f') {
                e.preventDefault();
                state.openFind();
            } else if (mod && e.key === '/') {
                e.preventDefault();
                state.toggleShortcuts();
            } else if (e.key === 'Escape') {
                if (state.findOpen) state.closeFind();
                else if (state.shortcutsOpen) state.closeShortcuts();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [store]);
}

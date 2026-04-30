import { useEffect } from 'react';
import * as Y from 'yjs';

const AUTO_INTERVAL_MS = 5 * 60 * 1000;
const DEBOUNCE_MS = 1200;
const JITTER_CAP_MS = 20 * 1000;

export function useAutoSnapshot(doc: Y.Doc, onSnapshot: () => void) {
    useEffect(() => {
        let lastAuto = 0;
        let debounceTimer: number | null = null;
        let deadlineTimer: number | null = null;

        const queueSnapshot = () => {
            const now = Date.now();
            const minDelay = Math.max(0, AUTO_INTERVAL_MS - (now - lastAuto));
            const cappedDelay = Math.min(minDelay, JITTER_CAP_MS);
            const runSnapshot = () => {
                if (debounceTimer !== null) {
                    window.clearTimeout(debounceTimer);
                    debounceTimer = null;
                }
                if (deadlineTimer !== null) {
                    window.clearTimeout(deadlineTimer);
                    deadlineTimer = null;
                }
                lastAuto = Date.now();
                onSnapshot();
            };
            if (debounceTimer !== null) window.clearTimeout(debounceTimer);
            debounceTimer = window.setTimeout(runSnapshot, DEBOUNCE_MS);
            if (deadlineTimer === null) {
                deadlineTimer = window.setTimeout(runSnapshot, cappedDelay);
            }
        };

        const onUpdate = (_update: Uint8Array, origin: unknown) => {
            if (origin === null || origin === undefined) return;
            queueSnapshot();
        };

        doc.on('update', onUpdate);
        return () => {
            doc.off('update', onUpdate);
            if (debounceTimer !== null) window.clearTimeout(debounceTimer);
            if (deadlineTimer !== null) window.clearTimeout(deadlineTimer);
        };
    }, [doc, onSnapshot]);
}

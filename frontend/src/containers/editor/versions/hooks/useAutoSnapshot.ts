import { useEffect } from 'react';
import * as Y from 'yjs';
import { bookSnapshotCreate } from '@/api/generated/services.gen';
import { AUTO_SNAPSHOT_IDLE_MS, AUTO_SNAPSHOT_INTERVAL_MS } from '@/containers/editor/versions/constants';

// Hocuspocus uses `null` as the local-edit origin.
// Remote updates carry a non-null origin (the provider instance).
function isLocalEdit(origin: unknown): boolean {
    return origin === null || origin === undefined;
}

export function useAutoSnapshot(doc: Y.Doc, bookId: string) {
    useEffect(() => {
        let idleTimer: number | null = null;
        let capTimer: number | null = null;
        let hasPendingCap = false;

        const clearIdleTimer = () => {
            if (idleTimer !== null) { window.clearTimeout(idleTimer); idleTimer = null; }
        };

        const fireSnapshot = async () => {
            clearIdleTimer();
            if (capTimer !== null) { window.clearTimeout(capTimer); capTimer = null; }
            hasPendingCap = false;
            try {
                await bookSnapshotCreate({
                    path: { bookId },
                    body: { label: `auto:${new Date().toISOString()}` },
                });
            } catch {
                // Autosnapshot failures are non-critical; next interval will retry.
            }
        };

        const onLocalEdit = () => {
            clearIdleTimer();
            idleTimer = window.setTimeout(fireSnapshot, AUTO_SNAPSHOT_IDLE_MS);
            if (!hasPendingCap) {
                hasPendingCap = true;
                capTimer = window.setTimeout(fireSnapshot, AUTO_SNAPSHOT_INTERVAL_MS);
            }
        };

        const handleUpdate = (_update: Uint8Array, origin: unknown) => {
            if (!isLocalEdit(origin)) return;
            onLocalEdit();
        };

        doc.on('update', handleUpdate);
        return () => {
            doc.off('update', handleUpdate);
            clearIdleTimer();
            if (capTimer !== null) window.clearTimeout(capTimer);
        };
    }, [doc, bookId]);
}

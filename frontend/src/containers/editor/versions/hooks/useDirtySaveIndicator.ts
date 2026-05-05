import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import { SAVE_STATUS_DEBOUNCE_MS } from '@/containers/editor/versions/constants';

export enum SaveStatus {
    Idle = 'idle',
    Saving = 'saving',
    Saved = 'saved',
    Offline = 'offline',
    Error = 'error',
}

// Hocuspocus local edits use null origin; remote edits carry the provider instance.
function isLocalEdit(origin: unknown): boolean {
    return origin === null || origin === undefined;
}

export function useDirtySaveIndicator(doc: Y.Doc, provider: HocuspocusProvider): SaveStatus {
    const [status, setStatus] = useState<SaveStatus>(SaveStatus.Idle);

    useEffect(() => {
        let savingTimer: number | null = null;

        const markSaved = () => {
            if (savingTimer !== null) { window.clearTimeout(savingTimer); savingTimer = null; }
            setStatus(SaveStatus.Saved);
        };

        const onUpdate = (_update: Uint8Array, origin: unknown) => {
            if (!isLocalEdit(origin)) return;
            setStatus(SaveStatus.Saving);
            if (savingTimer !== null) window.clearTimeout(savingTimer);
            // Yjs+Hocuspocus syncs immediately on local edit; show "saved" after brief debounce.
            savingTimer = window.setTimeout(markSaved, SAVE_STATUS_DEBOUNCE_MS);
        };

        const onStatus = ({ status: ws }: { status: string }) => {
            if (ws === 'disconnected') setStatus(SaveStatus.Offline);
            else if (ws === 'connected') setStatus((prev) => prev === SaveStatus.Offline ? SaveStatus.Saved : prev);
        };

        doc.on('update', onUpdate);
        provider.on('status', onStatus);
        return () => {
            doc.off('update', onUpdate);
            provider.off('status', onStatus);
            if (savingTimer !== null) window.clearTimeout(savingTimer);
        };
    }, [doc, provider]);

    return status;
}

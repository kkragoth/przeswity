import { useEffect, useState } from 'react';
import type { CollabBundle } from '@/editor/collab/yDoc';

const SKELETON_TIMEOUT_MS = 4000;

export function useInitialSync(collab: CollabBundle | null): boolean {
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (!collab) { setDone(false); return; }
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            setDone(true);
        };

        const onSynced = (e?: { state?: boolean }) => {
            if (e?.state !== false) finish();
        };
        const onAuthFailed = () => finish();
        const onClose = () => finish();

        collab.provider.on('synced', onSynced as never);
        collab.provider.on('authenticationFailed', onAuthFailed as never);
        collab.provider.on('close', onClose as never);

        const timeout = window.setTimeout(finish, SKELETON_TIMEOUT_MS);

        return () => {
            window.clearTimeout(timeout);
            collab.provider.off('synced', onSynced as never);
            collab.provider.off('authenticationFailed', onAuthFailed as never);
            collab.provider.off('close', onClose as never);
        };
    }, [collab]);

    return done;
}

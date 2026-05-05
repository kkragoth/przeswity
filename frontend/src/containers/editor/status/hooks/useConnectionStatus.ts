import { useCallback, useEffect, useState } from 'react';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import { SyncStatus, getProviderSyncStatus, asProviderRuntime } from '@/editor/collab/syncStatus';

export { SyncStatus } from '@/editor/collab/syncStatus';

export interface ConnectionState {
    status: SyncStatus;
    reconnect: () => void;
    lastSavedAt: number | null;
}

export function useConnectionStatus(provider: HocuspocusProvider): ConnectionState {
    const [status, setStatus] = useState<SyncStatus>(() => getProviderSyncStatus(provider));
    const [lastSavedAt, setLastSavedAt] = useState<number | null>(
        () => (getProviderSyncStatus(provider) === SyncStatus.Online ? Date.now() : null),
    );
    // Tracks whether the last failure was a permanent auth rejection. Auto-retry is
    // suspended until the user triggers a manual reconnect (which resets this flag).
    const [authFailed, setAuthFailed] = useState(false);

    const reconnect = useCallback(() => {
        setAuthFailed(false);
        try {
            const runtime = asProviderRuntime(provider);
            if (runtime?.configuration?.websocketProvider) {
                runtime.configuration.websocketProvider.shouldConnect = true;
            }
            void provider.connect();
            setStatus(SyncStatus.Connecting);
        } catch (err) {
            console.warn('[collab] manual reconnect failed', err);
        }
    }, [provider]);

    useEffect(() => {
        const markSaved = () => {
            setAuthFailed(false);
            setStatus(SyncStatus.Online);
            setLastSavedAt(Date.now());
        };
        const onStatus = (e: { connected?: boolean; status?: string }) => {
            if (e.connected === true || e.status === 'connected') markSaved();
            else if (e.connected === false || e.status === 'disconnected') setStatus(SyncStatus.Offline);
            else if (e.status === 'connecting') setStatus(SyncStatus.Connecting);
        };
        const onSynced = (e?: { state?: boolean }) => {
            if (e?.state === false) {
                setStatus(getProviderSyncStatus(provider));
                return;
            }
            markSaved();
        };
        const onClose = () => setStatus(SyncStatus.Offline);
        const onAuthFailed = () => {
            setAuthFailed(true);
            setStatus(SyncStatus.Offline);
        };

        provider.on('status', onStatus as never);
        provider.on('synced', onSynced as never);
        provider.on('close', onClose as never);
        provider.on('authenticationFailed', onAuthFailed as never);
        setStatus(getProviderSyncStatus(provider));

        return () => {
            provider.off('status', onStatus as never);
            provider.off('synced', onSynced as never);
            provider.off('close', onClose as never);
            provider.off('authenticationFailed', onAuthFailed as never);
        };
    }, [provider]);

    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState !== 'visible') return;
            if (getProviderSyncStatus(provider) === SyncStatus.Online) return;
            if (authFailed) return;
            reconnect();
        };
        const onOnline = () => {
            if (getProviderSyncStatus(provider) !== SyncStatus.Online && !authFailed) reconnect();
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        window.addEventListener('online', onOnline);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
            window.removeEventListener('online', onOnline);
        };
    }, [provider, reconnect, authFailed]);

    useEffect(() => {
        if (status === SyncStatus.Online || authFailed) return;
        const retry = window.setInterval(() => {
            if (document.visibilityState !== 'visible') return;
            if (getProviderSyncStatus(provider) !== SyncStatus.Online) reconnect();
        }, 3000);
        return () => window.clearInterval(retry);
    }, [provider, reconnect, status, authFailed]);

    return { status, reconnect, lastSavedAt };
}

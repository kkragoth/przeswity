import { useCallback, useEffect, useState } from 'react';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { HocuspocusProviderRuntime } from '@/editor/yjs/types';
import { SyncStatus, getProviderSyncStatus } from '@/editor/collab/syncStatus';

export { SyncStatus } from '@/editor/collab/syncStatus';

export interface ConnectionState {
    status: SyncStatus;
    reconnect: () => void;
}

export function useConnectionStatus(provider: HocuspocusProvider): ConnectionState {
    const [status, setStatus] = useState<SyncStatus>(() => getProviderSyncStatus(provider));

    const reconnect = useCallback(() => {
        try {
            const runtime = provider as unknown as HocuspocusProviderRuntime;
            if (runtime.configuration?.websocketProvider) {
                runtime.configuration.websocketProvider.shouldConnect = true;
            }
            void provider.connect();
            setStatus(SyncStatus.Connecting);
        } catch (err) {
            console.warn('[collab] manual reconnect failed', err);
        }
    }, [provider]);

    useEffect(() => {
        const onStatus = (e: { connected?: boolean; status?: string }) => {
            if (e.connected === true || e.status === 'connected') setStatus(SyncStatus.Online);
            else if (e.connected === false || e.status === 'disconnected') setStatus(SyncStatus.Offline);
            else if (e.status === 'connecting') setStatus(SyncStatus.Connecting);
        };
        const onSynced = (e?: { state?: boolean }) =>
            setStatus(e?.state === false ? getProviderSyncStatus(provider) : SyncStatus.Online);
        const onClose = () => setStatus(SyncStatus.Offline);
        const onAuthFailed = () => setStatus(SyncStatus.Offline);

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
            reconnect();
        };
        const onOnline = () => {
            if (getProviderSyncStatus(provider) !== SyncStatus.Online) reconnect();
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        window.addEventListener('online', onOnline);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
            window.removeEventListener('online', onOnline);
        };
    }, [provider, reconnect]);

    useEffect(() => {
        if (status === SyncStatus.Online) return;
        const retry = window.setInterval(() => {
            if (document.visibilityState !== 'visible') return;
            if (getProviderSyncStatus(provider) !== SyncStatus.Online) reconnect();
        }, 3000);
        return () => window.clearInterval(retry);
    }, [provider, reconnect, status]);

    return { status, reconnect };
}

import { useCallback, useEffect, useState } from 'react'
import type { HocuspocusProvider } from '@hocuspocus/provider'

export type ConnectionStatus = 'connecting' | 'online' | 'offline'

interface ProviderRuntime {
    status?: string;
    isConnected?: boolean;
    synced?: boolean;
}

function readStatus(provider: HocuspocusProvider): ConnectionStatus {
    const p = provider as unknown as ProviderRuntime;
    if (p.synced || p.isConnected || p.status === 'connected') return 'online';
    if (p.status === 'disconnected') return 'offline';
    return 'connecting';
}

export interface ConnectionState {
    status: ConnectionStatus;
    reconnect: () => void;
}

export function useConnectionStatus(provider: HocuspocusProvider): ConnectionState {
    const [status, setStatus] = useState<ConnectionStatus>(() => readStatus(provider));

    const reconnect = useCallback(() => {
        try {
            (provider as unknown as { shouldConnect?: boolean }).shouldConnect = true;
            void provider.connect();
            setStatus('connecting');
        } catch (err) {
            console.warn('[collab] manual reconnect failed', err);
        }
    }, [provider]);

    useEffect(() => {
        const onStatus = (e: { connected?: boolean; status?: string }) => {
            if (e.connected === true || e.status === 'connected') setStatus('online');
            else if (e.connected === false || e.status === 'disconnected') setStatus('offline');
            else if (e.status === 'connecting') setStatus('connecting');
        };
        const onSynced = () => setStatus('online');
        const onClose = () => setStatus('offline');
        const onAuthFailed = () => setStatus('offline');

        provider.on('status', onStatus as never);
        provider.on('synced', onSynced as never);
        provider.on('close', onClose as never);
        provider.on('authenticationFailed', onAuthFailed as never);
        setStatus(readStatus(provider));

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
            if (readStatus(provider) === 'online') return;
            reconnect();
        };
        const onOnline = () => {
            if (readStatus(provider) !== 'online') reconnect();
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

    return { status, reconnect };
}

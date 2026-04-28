import { useCallback, useEffect, useState } from 'react';
import type { HocuspocusProvider } from '@hocuspocus/provider';

export type ConnectionStatus = 'connecting' | 'online' | 'offline'

interface ProviderRuntime {
    status?: string;
    isConnected?: boolean;
    synced?: boolean;
    isSynced?: boolean;
    configuration?: {
        websocketProvider?: {
            status?: string;
            shouldConnect?: boolean;
            connect?: () => Promise<unknown> | void;
        };
    };
}

function readStatus(provider: HocuspocusProvider): ConnectionStatus {
    const p = provider as unknown as ProviderRuntime;
    const socketStatus = p.configuration?.websocketProvider?.status;
    const status = p.status ?? socketStatus;
    if (status === 'disconnected' || socketStatus === 'disconnected') return 'offline';
    if (status === 'connecting' || socketStatus === 'connecting') return 'connecting';
    if (status === 'connected' || socketStatus === 'connected') return 'online';
    if ((p.synced || p.isSynced) && p.isConnected) return 'online';
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
            const runtime = provider as unknown as ProviderRuntime;
            if (runtime.configuration?.websocketProvider) {
                runtime.configuration.websocketProvider.shouldConnect = true;
            }
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
        const onSynced = (e?: { state?: boolean }) => setStatus(e?.state === false ? readStatus(provider) : 'online');
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

    useEffect(() => {
        if (status === 'online') return;
        const retry = window.setInterval(() => {
            if (document.visibilityState !== 'visible') return;
            if (readStatus(provider) !== 'online') reconnect();
        }, 3000);
        return () => window.clearInterval(retry);
    }, [provider, reconnect, status]);

    return { status, reconnect };
}

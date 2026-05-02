import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { HocuspocusProviderRuntime } from '@/editor/yjs/types';

export enum SyncStatus {
    Online = 'online',
    Connecting = 'connecting',
    Offline = 'offline',
}

export function getProviderSyncStatus(provider: HocuspocusProvider): SyncStatus {
    const p = provider as unknown as HocuspocusProviderRuntime;
    const socketStatus = p.configuration?.websocketProvider?.status;
    const status = p.status ?? socketStatus;
    if (status === 'disconnected' || socketStatus === 'disconnected') return SyncStatus.Offline;
    if (status === 'connecting' || socketStatus === 'connecting') return SyncStatus.Connecting;
    if (status === 'connected' || socketStatus === 'connected') return SyncStatus.Online;
    if ((p.synced || p.isSynced) && p.isConnected) return SyncStatus.Online;
    return SyncStatus.Connecting;
}

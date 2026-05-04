import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { HocuspocusProviderRuntime } from '@/editor/collab/types';

export enum SyncStatus {
    Online = 'online',
    Connecting = 'connecting',
    Offline = 'offline',
}

/**
 * Duck-typed narrowing guard.
 * HocuspocusProvider's public API does not expose `status`, `synced`,
 * `isSynced`, `isConnected`, or `configuration.websocketProvider` — those
 * fields live on the runtime object. We verify the minimal shape before
 * reading any of them; if the shape is absent we fall back to a safe default.
 */
function isProviderRuntimeShaped(p: unknown): p is HocuspocusProviderRuntime {
    return typeof p === 'object' && p !== null && 'status' in p;
}

/**
 * Single place that performs the `as unknown as HocuspocusProviderRuntime`
 * cast. All other callers must go through this export so the unsafe access
 * is confined to one documented surface.
 */
export function asProviderRuntime(provider: HocuspocusProvider): HocuspocusProviderRuntime | null {
    return isProviderRuntimeShaped(provider as unknown) ? (provider as unknown as HocuspocusProviderRuntime) : null;
}

export function getProviderSyncStatus(provider: HocuspocusProvider): SyncStatus {
    const p = asProviderRuntime(provider);
    if (!p) return SyncStatus.Connecting;
    const socketStatus = p.configuration?.websocketProvider?.status;
    const status = p.status ?? socketStatus;
    if (status === 'disconnected' || socketStatus === 'disconnected') return SyncStatus.Offline;
    if (status === 'connecting' || socketStatus === 'connecting') return SyncStatus.Connecting;
    if (status === 'connected' || socketStatus === 'connected') return SyncStatus.Online;
    if ((p.synced || p.isSynced) && p.isConnected) return SyncStatus.Online;
    return SyncStatus.Connecting;
}

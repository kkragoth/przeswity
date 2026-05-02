import { describe, expect, it } from 'vitest';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import { SyncStatus, getProviderSyncStatus } from '@/editor/collab/syncStatus';

function makeProvider(overrides: Record<string, unknown> = {}): HocuspocusProvider {
    return {
        status: undefined,
        isConnected: false,
        synced: false,
        isSynced: false,
        configuration: {
            websocketProvider: { status: undefined },
        },
        ...overrides,
    } as unknown as HocuspocusProvider;
}

describe('getProviderSyncStatus', () => {
    it('returns Online when status is connected', () => {
        const p = makeProvider({ status: 'connected' });
        expect(getProviderSyncStatus(p)).toBe(SyncStatus.Online);
    });

    it('returns Offline when status is disconnected', () => {
        const p = makeProvider({ status: 'disconnected' });
        expect(getProviderSyncStatus(p)).toBe(SyncStatus.Offline);
    });

    it('returns Connecting when status is connecting', () => {
        const p = makeProvider({ status: 'connecting' });
        expect(getProviderSyncStatus(p)).toBe(SyncStatus.Connecting);
    });

    it('returns Online when synced and connected', () => {
        const p = makeProvider({ synced: true, isConnected: true });
        expect(getProviderSyncStatus(p)).toBe(SyncStatus.Online);
    });

    it('returns Connecting as fallback with no status', () => {
        const p = makeProvider();
        expect(getProviderSyncStatus(p)).toBe(SyncStatus.Connecting);
    });

    it('prefers socket disconnected over provider status', () => {
        const p = makeProvider({
            status: 'connected',
            configuration: { websocketProvider: { status: 'disconnected' } },
        });
        expect(getProviderSyncStatus(p)).toBe(SyncStatus.Offline);
    });
});

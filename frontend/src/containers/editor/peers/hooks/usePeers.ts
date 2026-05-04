import { useEffect, useState } from 'react';
import type { HocuspocusProvider } from '@hocuspocus/provider';

export interface Peer {
    name: string
    color: string
    userId: string
    clientId: number
    lastActiveAt: number
}

interface AwarenessUser {
    name?: string
    color?: string
    userId?: string
    lastActiveAt?: number
}

export function usePeers(provider: HocuspocusProvider): Peer[] {
    const [peers, setPeers] = useState<Peer[]>([]);
    useEffect(() => {
        const awareness = provider.awareness;
        if (!awareness) return;
        const update = () => {
            const out: Peer[] = [];
            const seen = new Set<string>();
            const localClientId = awareness.clientID;
            for (const [clientId, state] of awareness.getStates() as Map<number, { user?: AwarenessUser }>) {
                if (clientId === localClientId) continue;
                const u = state.user;
                if (!u?.name) continue;
                const dedupe = u.userId ?? `${u.name}::${u.color}`;
                if (seen.has(dedupe)) continue;
                seen.add(dedupe);
                out.push({
                    name: u.name,
                    color: u.color ?? 'var(--text-muted)',
                    userId: u.userId ?? dedupe,
                    clientId,
                    lastActiveAt: u.lastActiveAt ?? 0,
                });
            }
            setPeers(out);
        };
        awareness.on('change', update);
        update();
        return () => {
            awareness.off('change', update);
        };
    }, [provider]);
    return peers;
}

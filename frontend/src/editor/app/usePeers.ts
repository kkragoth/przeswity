import { useEffect, useState } from 'react';
import type { HocuspocusProvider } from '@hocuspocus/provider';

export interface Peer {
  name: string
  color: string
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
            for (const [clientId, state] of awareness.getStates() as Map<number, { user?: Peer }>) {
                if (clientId === localClientId) continue;
                if (!state.user?.name) continue;
                const dedupeKey = `${state.user.name}::${state.user.color}`;
                if (seen.has(dedupeKey)) continue;
                seen.add(dedupeKey);
                out.push({ name: state.user.name, color: state.user.color });
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

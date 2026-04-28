import { useEffect } from 'react';

const HEARTBEAT_MS = 25_000;

interface HeartbeatProvider {
    sendStateless?: (msg: string) => void;
}

export function usePresenceHeartbeat(provider: HeartbeatProvider | null) {
    useEffect(() => {
        if (!provider?.sendStateless) return;
        let cancelled = false;
        let timer: number | undefined;

        const tick = () => {
            if (cancelled) return;
            if (document.visibilityState === 'visible') {
                try {
                    provider.sendStateless?.('ping');
                } catch {
                    // Provider may be torn down between scheduling and firing.
                }
            }
            timer = window.setTimeout(tick, HEARTBEAT_MS);
        };

        timer = window.setTimeout(tick, HEARTBEAT_MS);

        return () => {
            cancelled = true;
            if (timer !== undefined) clearTimeout(timer);
        };
    }, [provider]);
}

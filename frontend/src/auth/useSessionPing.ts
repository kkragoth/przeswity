import { useEffect } from 'react';
import { authClient } from '@/auth/client';

const TEN_MIN_MS = 10 * 60 * 1000;

export function useSessionPing() {
    useEffect(() => {
        let cancelled = false;
        let timer: number | undefined;

        const schedule = () => {
            timer = window.setTimeout(tick, TEN_MIN_MS);
        };

        const tick = async () => {
            if (cancelled) return;
            if (document.visibilityState === 'visible') {
                try {
                    await authClient.getSession();
                } catch {
                    // Interceptor handles auth failures; ignore here.
                }
            }
            schedule();
        };

        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                void authClient.getSession().catch(() => {});
            }
        };

        document.addEventListener('visibilitychange', onVisibility);
        schedule();

        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', onVisibility);
            if (timer !== undefined) clearTimeout(timer);
        };
    }, []);
}

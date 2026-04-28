import { client } from '@/api/generated/services.gen';
import { authClient } from '@/auth/client';
import { queryClient } from '@/app/queryClient';
import { router } from '@/app/router';

type RefreshResult = { ok: true } | { ok: false };
let refreshPromise: Promise<RefreshResult> | null = null;

async function tryRefreshSession(): Promise<RefreshResult> {
    if (!refreshPromise) {
        refreshPromise = (async (): Promise<RefreshResult> => {
            try {
                const { data } = await authClient.getSession();
                return data ? { ok: true } : { ok: false };
            } catch {
                return { ok: false };
            }
        })();
        void refreshPromise.finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}

async function redirectToLogin() {
    if (typeof location === 'undefined') return;
    if (location.pathname.startsWith('/login')) return;
    const next = location.pathname + location.search;
    try {
        await router.navigate({ to: '/login', search: { next } as never });
    } catch {
        location.href = `/login?next=${encodeURIComponent(next)}`;
    }
}

type RetryableRequest = Request & { __retried?: boolean };

client.interceptors.response.use(async (response, request) => {
    if (response.status !== 401) return response;
    const req = request as RetryableRequest;
    if (req.__retried) return response;

    const result = await tryRefreshSession();
    if (result.ok) {
        req.__retried = true;
        return fetch(request);
    }

    queryClient.clear();
    await redirectToLogin();
    return response;
});

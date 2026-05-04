import { client } from '@/api/generated/services.gen';
import { authClient } from '@/auth/client';
import { queryClient } from '@/app/queryClient';
import { router } from '@/app/router';

// Do not attach these interceptors more than once — dedup relies on module-scoped
// refreshPromise and retried WeakSet; a second registration would bypass both guards.
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
        void refreshPromise.finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
}

export function buildLoginRedirectUrl(pathname: string, search: string): string {
    const next = pathname + search;
    return `/login?next=${encodeURIComponent(next)}`;
}

const retried = new WeakSet<Request>();

async function redirectToLogin() {
    if (typeof location === 'undefined') return;
    if (location.pathname.startsWith('/login')) return;
    const next = location.pathname + location.search;
    try {
        await router.navigate({ to: '/login', search: { next } });
    } catch {
        location.href = buildLoginRedirectUrl(location.pathname, location.search);
    }
}

client.interceptors.response.use(async (response, request) => {
    if (response.status !== 401) return response;
    if (retried.has(request)) return response;

    const result = await tryRefreshSession();
    if (result.ok) {
        retried.add(request);
        return fetch(request);
    }

    queryClient.clear();
    await redirectToLogin();
    return response;
});

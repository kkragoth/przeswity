import { createFileRoute, redirect, Outlet, useRouterState } from '@tanstack/react-router';
import { authClient } from '@/auth/client';
import { useSessionPing } from '@/hooks/api/useSessionPing';
import { AppTopBar } from '@/components/layout/AppTopBar';
import type { Session, SessionUser } from '@/auth/types';
import { isImmersiveRoute } from '@/lib/routes';

export const Route = createFileRoute('/_app')({
    async beforeLoad({ location }) {
        try {
            const { data } = await authClient.getSession();
            if (!data) {
                throw redirect({ to: '/login', search: { next: location.href } as never });
            }
            return { session: data as unknown as Session };
        } catch (error) {
            // Network/backend failures should not crash router matching.
            console.warn('Session lookup failed, redirecting to login.', error);
            throw redirect({
                to: '/login',
                search: { next: location.href, reason: 'session-unavailable' } as never,
            });
        }
    },
    component: AppLayout,
});

function AppLayout() {
    const { session } = Route.useRouteContext();
    useSessionPing();
    const user = session.user as SessionUser;
    const pathname = useRouterState({ select: (s) => s.location.pathname });
    const immersive = isImmersiveRoute(pathname);

    if (immersive) {
        return (
            <div className="h-dvh overflow-hidden flex flex-col bg-background text-foreground">
                <Outlet />
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-background text-foreground flex flex-col">
            <AppTopBar user={user} />
            <main className="flex-1 flex flex-col min-h-0">
                <Outlet />
            </main>
        </div>
    );
}

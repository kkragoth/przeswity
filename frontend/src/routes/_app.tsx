import { createFileRoute, redirect, Outlet, useRouterState } from '@tanstack/react-router';
import { authClient } from '@/auth/client';
import { useSessionPing } from '@/auth/useSessionPing';
import { AppTopBar } from '@/components/AppTopBar';
import type { Session, SessionUser } from '@/auth/types';

export const Route = createFileRoute('/_app')({
    async beforeLoad({ location }) {
        const { data } = await authClient.getSession();
        if (!data) {
            throw redirect({ to: '/login', search: { next: location.href } as never });
        }
        return { session: data as unknown as Session };
    },
    component: AppLayout,
});

function isImmersiveRoute(pathname: string): boolean {
    return /^\/books\/[^/]+$/.test(pathname);
}

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

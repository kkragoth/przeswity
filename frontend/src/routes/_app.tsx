import { createFileRoute, redirect, Outlet, Link, useRouterState } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { authClient } from '@/auth/client';
import { LanguageSwitcher } from '@/i18n/LanguageSwitcher';
import { useSessionPing } from '@/auth/useSessionPing';
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

/**
 * Hide the global chrome on routes that own the full viewport
 * (today: the editor at /books/$bookId — owns its own header).
 */
function isImmersiveRoute(pathname: string): boolean {
    return pathname === '/books' || /^\/books\/[^/]+$/.test(pathname);
}

function AppLayout() {
    const { session } = Route.useRouteContext();
    const { t } = useTranslation('common');
    useSessionPing();
    const user = session.user as SessionUser;
    const pathname = useRouterState({ select: (s) => s.location.pathname });
    const immersive = isImmersiveRoute(pathname);

    if (immersive) {
        return (
            <div className="min-h-dvh flex flex-col bg-background text-foreground">
                <Outlet />
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-background text-foreground flex flex-col">
            <header className="bg-card border-b border-border">
                <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
                    <Link to="/" className="font-serif text-lg font-semibold tracking-tight">{t('appName')}</Link>
                    <nav className="flex items-center gap-4 text-sm">
                        <Link to="/books" className="hover:text-primary transition-colors">{t('nav.books')}</Link>
                        {user.isAdmin && (
                            <Link to="/admin" className="hover:text-primary transition-colors">{t('nav.admin')}</Link>
                        )}
                        {(user.isAdmin || user.isCoordinator) && (
                            <Link to="/coordinator" className="hover:text-primary transition-colors">{t('nav.coordinator')}</Link>
                        )}
                        <Link to="/settings" className="hover:text-primary transition-colors">{t('nav.settings')}</Link>
                        <LanguageSwitcher />
                        <span className="text-muted-foreground">{user.email}</span>
                    </nav>
                </div>
            </header>
            <main className="flex-1 flex flex-col min-h-0">
                <Outlet />
            </main>
        </div>
    );
}

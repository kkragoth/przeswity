import { createFileRoute, redirect, Outlet, Link } from '@tanstack/react-router';
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

function AppLayout() {
    const { session } = Route.useRouteContext();
    const { t } = useTranslation('common');
    useSessionPing();
    const user = session.user as SessionUser;
    return (
        <div className="min-h-dvh bg-stone-100 flex flex-col">
            <header className="bg-white border-b">
                <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
                    <Link to="/" className="font-semibold text-lg">{t('appName')}</Link>
                    <nav className="flex items-center gap-4 text-sm">
                        <Link to="/books" className="hover:underline">{t('nav.books')}</Link>
                        {user.isAdmin && (
                            <Link to="/admin" className="hover:underline">{t('nav.admin')}</Link>
                        )}
                        {(user.isAdmin || user.isCoordinator) && (
                            <Link to="/coordinator" className="hover:underline">{t('nav.coordinator')}</Link>
                        )}
                        <Link to="/settings" className="hover:underline">{t('nav.settings')}</Link>
                        <LanguageSwitcher />
                        <span className="text-stone-500">{user.email}</span>
                    </nav>
                </div>
            </header>
            <main className="flex-1">
                <Outlet />
            </main>
        </div>
    );
}

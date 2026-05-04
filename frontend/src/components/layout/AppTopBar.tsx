import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/i18n/LanguageSwitcher';
import type { SessionUser } from '@/auth/types';
import { canAccessAdmin, canAccessCoordinator } from '@/lib/auth';
import { UserMenu } from '@/components/layout/UserMenu';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

interface AppTopBarProps {
    user: SessionUser;
}

export function AppTopBar({ user }: AppTopBarProps) {
    const { t } = useTranslation('common');

    return (
        <header className="topbar">
            <Link to="/" className="topbar-logo" aria-label={t('appName')}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <rect x="3" y="4" width="3" height="12" rx="1" fill="currentColor" />
                    <rect x="8.5" y="4" width="2" height="12" rx="0.5" fill="currentColor" opacity="0.6" />
                    <rect x="13" y="4" width="3" height="12" rx="1" fill="currentColor" opacity="0.35" />
                </svg>
            </Link>
            <nav className="topbar-breadcrumb" aria-label="Main navigation">
                <Link to="/books" className="topbar-breadcrumb-link">{t('nav.books')}</Link>
                {canAccessCoordinator(user) && (
                    <Link to="/coordinator" className="topbar-breadcrumb-link">{t('nav.coordinator')}</Link>
                )}
                {canAccessAdmin(user) && (
                    <Link to="/admin" className="topbar-breadcrumb-link">{t('nav.admin')}</Link>
                )}
                <Link to="/settings" className="topbar-breadcrumb-link">{t('nav.settings')}</Link>
            </nav>
            <div className="topbar-spacer" />
            <div className="topbar-right">
                <LanguageSwitcher />
                <ThemeToggle />
                <UserMenu user={user} />
            </div>
        </header>
    );
}

import { Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { LogOut, Settings, BookOpen } from 'lucide-react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { authClient } from '@/auth/client';
import { LanguageSwitcher } from '@/i18n/LanguageSwitcher';
import { SystemRole } from '@/auth/types';
import type { SessionUser } from '@/auth/types';

interface AppTopBarProps {
    user: SessionUser;
}

function userInitials(name: string | null | undefined, email: string): string {
    if (name) {
        const parts = name.trim().split(/\s+/);
        return parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : name.slice(0, 2).toUpperCase();
    }
    return email[0].toUpperCase();
}

function UserMenu({ user }: { user: SessionUser }) {
    const { t } = useTranslation('common');
    const navigate = useNavigate();

    const handleLogout = async () => {
        await authClient.signOut();
        void navigate({ to: '/login', search: {} as never });
    };

    return (
        <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger asChild>
                <button type="button" className="topbar-avatar-trigger" aria-label={user.name ?? user.email}>
                    <span className="topbar-app-avatar">
                        {userInitials(user.name, user.email)}
                    </span>
                </button>
            </DropdownMenuPrimitive.Trigger>
            <DropdownMenuPrimitive.Portal>
                <DropdownMenuPrimitive.Content align="end" sideOffset={6} className="topbar-dropdown-content">
                    <div className="topbar-dropdown-header">
                        {user.name && <div className="topbar-dropdown-name">{user.name}</div>}
                        <div className="topbar-dropdown-email">{user.email}</div>
                    </div>
                    <div className="topbar-dropdown-sep" />
                    <DropdownMenuPrimitive.Item asChild>
                        <Link to="/books" className="topbar-dropdown-item">
                            <BookOpen size={14} />{t('nav.books')}
                        </Link>
                    </DropdownMenuPrimitive.Item>
                    <DropdownMenuPrimitive.Item asChild>
                        <Link to="/settings" className="topbar-dropdown-item">
                            <Settings size={14} />{t('nav.settings')}
                        </Link>
                    </DropdownMenuPrimitive.Item>
                    <div className="topbar-dropdown-sep" />
                    <DropdownMenuPrimitive.Item asChild>
                        <button
                            type="button"
                            className="topbar-dropdown-item topbar-dropdown-item--danger"
                            onClick={() => void handleLogout()}
                        >
                            <LogOut size={14} />{t('nav.signOut')}
                        </button>
                    </DropdownMenuPrimitive.Item>
                </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>
    );
}

export function AppTopBar({ user }: AppTopBarProps) {
    const { t } = useTranslation('common');

    return (
        <header className="topbar">
            <Link to="/" className="topbar-logo" aria-label="Prześwity">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <rect x="3" y="4" width="3" height="12" rx="1" fill="currentColor" />
                    <rect x="8.5" y="4" width="2" height="12" rx="0.5" fill="currentColor" opacity="0.6" />
                    <rect x="13" y="4" width="3" height="12" rx="1" fill="currentColor" opacity="0.35" />
                </svg>
            </Link>
            <nav className="topbar-breadcrumb" aria-label="Main navigation">
                <Link to="/books" className="topbar-breadcrumb-link">{t('nav.books')}</Link>
                {(user.systemRole === SystemRole.Admin || user.systemRole === SystemRole.ProjectManager) && (
                    <Link to="/coordinator" className="topbar-breadcrumb-link">{t('nav.coordinator')}</Link>
                )}
                {user.systemRole === SystemRole.Admin && (
                    <Link to="/admin" className="topbar-breadcrumb-link">{t('nav.admin')}</Link>
                )}
                <Link to="/settings" className="topbar-breadcrumb-link">{t('nav.settings')}</Link>
            </nav>
            <div className="topbar-spacer" />
            <div className="topbar-right">
                <LanguageSwitcher />
                <UserMenu user={user} />
            </div>
        </header>
    );
}

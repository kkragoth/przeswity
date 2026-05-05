import { Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { LogOut, Settings, BookOpen } from 'lucide-react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { authClient } from '@/auth/client';
import { queryClient } from '@/app/queryClient';
import { Avatar } from '@/components/Avatar';
import type { SessionUser } from '@/auth/types';

export function UserMenu({ user }: { user: SessionUser }) {
    const { t } = useTranslation('common');
    const navigate = useNavigate();

    const handleLogout = async () => {
        await authClient.signOut();
        queryClient.clear();
        void navigate({ to: '/login', search: {} });
    };

    return (
        <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger asChild>
                <button type="button" className="topbar-avatar-trigger" aria-label={user.name ?? user.email}>
                    <Avatar name={user.name ?? user.email} size="sm" />
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

import { Link, useNavigate } from '@tanstack/react-router';
import { BookOpen, Settings, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';

import { Avatar } from '@/editor/shell/Avatar';
import { RoleBadge } from '@/components/badges/RoleBadge';
import { authClient } from '@/auth/client';
import type { User } from '@/editor/identity/types';

export function UserMenu({ user }: { user: User }) {
    const { t } = useTranslation('editor');
    const navigate = useNavigate();
    const { data: session } = authClient.useSession();
    const email = session?.user?.email ?? '';

    const handleLogout = async () => {
        await authClient.signOut();
        void navigate({ to: '/login', search: {} as never });
    };

    return (
        <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger asChild>
                <button type="button" className="topbar-avatar-trigger" aria-label={user.name}>
                    <RoleBadge role={user.role} />
                    <Avatar name={user.name} color={user.color} size="sm" />
                </button>
            </DropdownMenuPrimitive.Trigger>
            <DropdownMenuPrimitive.Portal>
                <DropdownMenuPrimitive.Content align="end" sideOffset={6} className="topbar-dropdown-content">
                    <div className="topbar-dropdown-header">
                        <div className="topbar-dropdown-name">{user.name}</div>
                        {email ? <div className="topbar-dropdown-email">{email}</div> : null}
                    </div>
                    <div className="topbar-dropdown-sep" />
                    <DropdownMenuPrimitive.Item asChild>
                        <Link to="/books" className="topbar-dropdown-item">
                            <BookOpen size={14} />{t('topbar.menuMyBooks')}
                        </Link>
                    </DropdownMenuPrimitive.Item>
                    <DropdownMenuPrimitive.Item asChild>
                        <Link to="/settings" className="topbar-dropdown-item">
                            <Settings size={14} />{t('topbar.menuSettings')}
                        </Link>
                    </DropdownMenuPrimitive.Item>
                    <div className="topbar-dropdown-sep" />
                    <DropdownMenuPrimitive.Item asChild>
                        <button type="button" className="topbar-dropdown-item topbar-dropdown-item--danger" onClick={() => void handleLogout()}>
                            <LogOut size={14} />{t('topbar.menuLogout')}
                        </button>
                    </DropdownMenuPrimitive.Item>
                </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>
    );
}

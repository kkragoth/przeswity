import * as Y from 'yjs';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@tanstack/react-router';
import { Cloud, CloudOff, RefreshCw, Keyboard, ChevronRight, BookOpen, Settings, LogOut } from 'lucide-react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Avatar } from '../shell/Avatar';
import { CommentBell } from '../comments/CommentBell';
import { RoleBadge } from '@/components/RoleBadge';
import { authClient } from '@/auth/client';
import type { User } from '../identity/types';
import type { ConnectionStatus } from './useConnectionStatus';
import type { Peer } from './usePeers';

interface TopBarProps {
    doc: Y.Doc;
    room: string;
    user: User;
    bookTitle: string;
    connStatus: ConnectionStatus;
    onReconnect: () => void;
    peers: Peer[];
    onCommentBellClick: () => void;
    onShortcutsOpen: () => void;
}

function syncModifier(status: ConnectionStatus): string {
    if (status === 'online') return 'online';
    if (status === 'connecting') return 'connecting';
    return 'offline';
}

function SyncIcon({ status }: { status: ConnectionStatus }) {
    if (status === 'online') return <Cloud size={14} className="topbar-sync-icon" />;
    if (status === 'connecting') return <RefreshCw size={14} className="topbar-sync-icon" />;
    return <CloudOff size={14} className="topbar-sync-icon" />;
}

function SyncStatus({ status, room, onReconnect }: { status: ConnectionStatus; room: string; onReconnect: () => void }) {
    const { t } = useTranslation('editor');
    const label = status === 'online' ? t('topbar.synced') : status === 'connecting' ? t('topbar.syncing') : t('topbar.offlineLocal');
    return (
        <button
            type="button"
            className={`topbar-sync topbar-sync--${syncModifier(status)}`}
            title={`${room} — ${label}`}
            onClick={status === 'offline' ? onReconnect : undefined}
            disabled={status !== 'offline'}
        >
            <SyncIcon status={status} />
            <span>{label}</span>
        </button>
    );
}

function UserMenu({ user }: { user: User }) {
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
                    <Avatar name={user.name} color={user.color} size="sm" />
                    <RoleBadge role={user.role} />
                </button>
            </DropdownMenuPrimitive.Trigger>
            <DropdownMenuPrimitive.Portal>
                <DropdownMenuPrimitive.Content align="end" sideOffset={6} className="topbar-dropdown-content">
                    <div className="topbar-dropdown-header">
                        <div className="topbar-dropdown-name">{user.name}</div>
                        {email && <div className="topbar-dropdown-email">{email}</div>}
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
                        <button
                            type="button"
                            className="topbar-dropdown-item topbar-dropdown-item--danger"
                            onClick={() => void handleLogout()}
                        >
                            <LogOut size={14} />{t('topbar.menuLogout')}
                        </button>
                    </DropdownMenuPrimitive.Item>
                </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>
    );
}

export function TopBar({
    doc, room, user, bookTitle,
    connStatus, onReconnect, peers,
    onCommentBellClick, onShortcutsOpen,
}: TopBarProps) {
    const { t } = useTranslation('editor');
    return (
        <header className="topbar">
            <Link to="/books" className="topbar-logo" aria-label="Prześwity">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <rect x="3" y="4" width="3" height="12" rx="1" fill="currentColor" />
                    <rect x="8.5" y="4" width="2" height="12" rx="0.5" fill="currentColor" opacity="0.6" />
                    <rect x="13" y="4" width="3" height="12" rx="1" fill="currentColor" opacity="0.35" />
                </svg>
            </Link>
            <nav className="topbar-breadcrumb" aria-label="breadcrumb">
                <Link to="/books" className="topbar-breadcrumb-link">{t('topbar.booksLink')}</Link>
                <ChevronRight size={12} className="topbar-breadcrumb-sep" aria-hidden="true" />
                <span className="topbar-book-title" title={bookTitle}>{bookTitle}</span>
            </nav>
            <div className="topbar-spacer" />
            <SyncStatus status={connStatus} room={room} onReconnect={onReconnect} />
            <div className="topbar-spacer" />
            <div className="topbar-right">
                {peers.length > 0 && (
                    <div className="topbar-peers" title={t('topbar.peers')}>
                        {peers.map((p, i) => <Avatar key={i} name={p.name} color={p.color} size="sm" />)}
                    </div>
                )}
                <CommentBell doc={doc} room={room} userId={user.id} onClick={onCommentBellClick} />
                <UserMenu user={user} />
                <button type="button" className="topbar-icon-btn" title={`${t('topbar.shortcuts')} (⌘/)`} onClick={onShortcutsOpen} aria-label={t('topbar.shortcuts')}>
                    <Keyboard size={16} />
                </button>
            </div>
        </header>
    );
}

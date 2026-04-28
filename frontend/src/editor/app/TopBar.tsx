import type { Editor } from '@tiptap/react'
import * as Y from 'yjs'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../shell/Avatar'
import { CommentBell } from '../comments/CommentBell'
import { ExportMenu } from '../io/ExportMenu'
import { ImportMenu } from '../io/ImportMenu'
import { TemplatesMenu } from '../workflow/TemplatesMenu'
import type { User } from '../identity/types'
import { ROLE_PERMISSIONS } from '../identity/types'
import type { ConnectionStatus } from './useConnectionStatus'
import type { Peer } from './usePeers'

interface TopBarProps {
    doc: Y.Doc;
    room: string;
    user: User;
    bookTitle: string;
    suggestingMode: boolean;
    onSuggestingModeChange: (mode: boolean) => void;
    suggestingForced: boolean;
    connStatus: ConnectionStatus;
    onReconnect: () => void;
    peers: Peer[];
    editor: Editor | null;
    onCommentBellClick: () => void;
    onShortcutsOpen: () => void;
    onToast: (msg: string, kind?: 'info' | 'success' | 'error') => void;
}

export function TopBar({
    doc,
    room,
    user,
    bookTitle,
    suggestingMode,
    onSuggestingModeChange,
    suggestingForced,
    connStatus,
    onReconnect,
    peers,
    editor,
    onCommentBellClick,
    onShortcutsOpen,
    onToast,
}: TopBarProps) {
    const { t } = useTranslation('editor');
    const perms = ROLE_PERMISSIONS[user.role];
    const canToggleSuggest = !suggestingForced && (perms.canSuggest || perms.canEdit);
    const showSuggestToggle = canToggleSuggest || suggestingForced;
    const connLabel = t(`topbar.${connStatus === 'online' ? 'online' : connStatus === 'offline' ? 'offline' : 'reconnecting'}`);

    return (
        <header className="editor-toolbar">
            <div className="editor-toolbar-left">
                <h1 className="editor-doc-title" title={bookTitle}>{bookTitle}</h1>
                <button
                    type="button"
                    className={`conn-pill conn-${connStatus}`}
                    title={connStatus === 'online' ? `${room} — ${connLabel}` : t('topbar.reconnect')}
                    onClick={onReconnect}
                    disabled={connStatus === 'online' || connStatus === 'connecting'}
                >
                    <span className="conn-dot" />
                    {connLabel}
                </button>
            </div>
            <div className="editor-toolbar-right">
                {showSuggestToggle && (
                    <label className="suggesting-toggle" title={suggestingForced ? t('toolbar.suggestingForced') : ''}>
                        <input
                            type="checkbox"
                            checked={suggestingMode}
                            disabled={!canToggleSuggest}
                            onChange={(e) => onSuggestingModeChange(e.target.checked)}
                        />
                        <span>{t('toolbar.suggestingMode')}</span>
                    </label>
                )}
                <div className="peers" title={t('topbar.peers')}>
                    {peers.map((p, i) => (
                        <Avatar key={i} name={p.name} color={p.color} size="sm" />
                    ))}
                </div>
                <CommentBell doc={doc} room={room} userId={user.id} onClick={onCommentBellClick} />
                <button
                    type="button"
                    className="tb-btn"
                    title={t('topbar.shortcuts')}
                    onClick={onShortcutsOpen}
                >
                    ?
                </button>
                {perms.canEdit && <TemplatesMenu editor={editor} onToast={onToast} />}
                {perms.canEdit && <ImportMenu editor={editor} onToast={onToast} />}
                {perms.canExport && <ExportMenu editor={editor} />}
            </div>
        </header>
    );
}

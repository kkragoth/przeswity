import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
import type { User } from '@/editor/identity/types';
import { ROLE_PERMISSIONS } from '@/editor/identity/types';
import { formatReadingMinutes } from '@/editor/app/readingStats';
import { wordTargetFillColor, wordTargetPercentClamped, wordTargetPercentRounded } from '@/lib/wordTarget';
import type { ReadingStatsSummary } from '@/containers/editor/hooks/useReadingStats';
import type { ConnectionStatus } from '@/containers/editor/hooks/useConnectionStatus';
import type { Peer } from '@/containers/editor/hooks/usePeers';
import { PeerAvatarStack } from '@/containers/editor/components/peers/PeerAvatarStack';

interface StatusBarProps {
    wordCount: number
    charCount: number
    stats: ReadingStatsSummary
    targetWords: number | undefined
    user: User
    suggestingMode: boolean
    peers: Peer[]
    editor: Editor | null
    connStatus: ConnectionStatus
    onReconnect: () => void
}

function SyncMini({ status, onReconnect }: { status: ConnectionStatus; onReconnect: () => void }) {
    const { t } = useTranslation('editor');
    const label = status === 'online'
        ? t('topbar.synced')
        : status === 'connecting'
            ? t('topbar.syncing')
            : t('topbar.offlineLocal');

    const icon = status === 'online'
        ? <Cloud size={11} />
        : status === 'connecting'
            ? <RefreshCw size={11} className="statusbar-sync-spin" />
            : <CloudOff size={11} />;

    return (
        <button
            type="button"
            className={`statusbar-sync statusbar-sync--${status}`}
            onClick={status === 'offline' ? onReconnect : undefined}
            disabled={status !== 'offline'}
            title={status === 'offline' ? t('topbar.reconnect') : label}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}

export function StatusBar({
    wordCount,
    charCount,
    stats,
    targetWords,
    user,
    suggestingMode,
    peers,
    editor,
    connStatus,
    onReconnect,
}: StatusBarProps) {
    const { t } = useTranslation('editor');
    const perms = ROLE_PERMISSIONS[user.role];
    const mode = suggestingMode ? 'suggesting' : perms.canEdit ? 'editing' : 'viewing';
    return (
        <footer className="statusbar">
            <span>{wordCount.toLocaleString()} {t('statusbar.words')}</span>
            {targetWords && targetWords > 0 && (
                <span className="word-target" title={t('statusbar.targetTooltip', { target: targetWords.toLocaleString() })}>
                    <span className="word-target-bar">
                        <span
                            className="word-target-fill"
                            style={{
                                width: `${wordTargetPercentClamped(wordCount, targetWords)}%`,
                                background: wordTargetFillColor(wordCount, targetWords),
                            }}
                        />
                    </span>
                    <span className="word-target-text">
                        {t('statusbar.targetProgress', { percent: wordTargetPercentRounded(wordCount, targetWords), target: targetWords.toLocaleString() })}
                    </span>
                </span>
            )}
            <span>·</span>
            <span>{charCount.toLocaleString()} {t('statusbar.chars')}</span>
            <span>·</span>
            <span>{stats.paragraphs} ¶</span>
            <span>·</span>
            <span>{stats.sentences} {t('statusbar.sent')}</span>
            <span>·</span>
            <span>{formatReadingMinutes(stats.readingMinutes)}</span>
            <span>·</span>
            <span>{t('statusbar.role', { role: user.role })}</span>
            <span>·</span>
            <span>{t('statusbar.mode', { mode })}</span>
            {peers.length === 0 ? (
                <>
                    <span>·</span>
                    <span>{t('statusbar.soloOnline')}</span>
                </>
            ) : null}
            <span className="statusbar-spacer" />
            <PeerAvatarStack peers={peers} editor={editor} />
            <SyncMini status={connStatus} onReconnect={onReconnect} />
        </footer>
    );
}

import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { User } from '@/editor/identity/types';
import { ROLE_PERMISSIONS } from '@/editor/identity/types';
import { formatReadingMinutes } from '@/editor/app/readingStats';
import type { ReadingStatsSummary } from '@/containers/editor/hooks/useReadingStats';
import type { ConnectionStatus } from '@/containers/editor/hooks/useConnectionStatus';

interface StatusBarProps {
    wordCount: number
    charCount: number
    stats: ReadingStatsSummary
    targetWords: number | undefined
    user: User
    suggestingMode: boolean
    peerCount: number
    connStatus: ConnectionStatus
    onReconnect: () => void
}

function targetFillColor(words: number, target: number): string {
    if (words >= target) return '#16a34a';
    if (words >= target * 0.8) return '#eab308';
    return 'var(--accent)';
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
    peerCount,
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
                                width: `${Math.min(100, (wordCount / targetWords) * 100)}%`,
                                background: targetFillColor(wordCount, targetWords),
                            }}
                        />
                    </span>
                    <span className="word-target-text">
                        {t('statusbar.targetProgress', { percent: Math.round((wordCount / targetWords) * 100), target: targetWords.toLocaleString() })}
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
            <span>·</span>
            <span>{t('statusbar.usersOnline', { count: peerCount })}</span>
            <span className="statusbar-spacer" />
            <SyncMini status={connStatus} onReconnect={onReconnect} />
        </footer>
    );
}

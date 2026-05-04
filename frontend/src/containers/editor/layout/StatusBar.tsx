import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
import { formatReadingMinutes } from '@/editor/app/readingStats';
import { wordTargetFillColor, wordTargetPercentClamped, wordTargetPercentRounded } from '@/lib/wordTarget';
import { useReadingStats } from '@/containers/editor/hooks/useReadingStats';
import { useTargetWords } from '@/containers/editor/hooks/useTargetWords';
import { useConnectionStatus } from '@/containers/editor/hooks/useConnectionStatus';
import { usePageNavigation } from '@/containers/editor/outline/hooks/usePageNavigation';
import { PeerAvatarStack } from '@/containers/editor/peers';
import { PageJumper } from '@/containers/editor/layout/PageJumper';
import { SyncMini } from '@/containers/editor/components/status/SyncMini';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useEditorLive } from '@/containers/editor/session/LiveProvider';

interface StatusBarProps {
    editor: Editor | null;
}

function modeKey(suggestingMode: boolean, canEdit: boolean): 'suggesting' | 'editing' | 'viewing' {
    if (suggestingMode) return 'suggesting';
    return canEdit ? 'editing' : 'viewing';
}

function WordCountTarget({ wordCount, targetWords }: { wordCount: number; targetWords: number }) {
    const { t } = useTranslation('editor');
    return (
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
                {t('statusbar.targetProgress', {
                    percent: wordTargetPercentRounded(wordCount, targetWords),
                    target: targetWords.toLocaleString(),
                })}
            </span>
        </span>
    );
}

export function StatusBar({ editor }: StatusBarProps) {
    const { t } = useTranslation('editor');
    const { user, perms, collab } = useEditorSession();
    const suggestingMode = useEditorLive((s) => s.suggesting.effective);
    const peerCount = useEditorLive((s) => s.peers.length);
    const stats = useReadingStats(editor);
    const targetWords = useTargetWords(collab.doc);
    const conn = useConnectionStatus(collab.provider);
    const pageNav = usePageNavigation(editor);

    const wordCount = editor?.storage.characterCount?.words() ?? 0;
    const charCount = editor?.storage.characterCount?.characters() ?? 0;
    const mode = modeKey(suggestingMode, perms.canEdit);
    const hasTarget = targetWords !== undefined && targetWords > 0;

    return (
        <footer className="statusbar">
            <span>{wordCount.toLocaleString()} {t('statusbar.words')}</span>
            {hasTarget ? <WordCountTarget wordCount={wordCount} targetWords={targetWords} /> : null}
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
            {peerCount === 0 ? (
                <>
                    <span>·</span>
                    <span>{t('statusbar.soloOnline')}</span>
                </>
            ) : null}
            <span className="statusbar-spacer" />
            <PageJumper current={pageNav.current} total={pageNav.total} onJump={pageNav.jumpTo} />
            <PeerAvatarStack editor={editor} />
            <SyncMini status={conn.status} onReconnect={conn.reconnect} />
        </footer>
    );
}

import { useTranslation } from 'react-i18next';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { Editor } from '@tiptap/react';
import { wordTargetFillColor, wordTargetPercentClamped, wordTargetPercentRounded } from '@/lib/wordTarget';
import { useReadingStats } from '@/containers/editor/hooks/useReadingStats';
import { useTargetWords } from '@/containers/editor/hooks/useTargetWords';
import { useConnectionStatus } from '@/containers/editor/status/hooks/useConnectionStatus';
import { usePageNavigation } from '@/containers/editor/outline/hooks/usePageNavigation';
import { PeerAvatarStack } from '@/containers/editor/peers';
import { PageJumper } from '@/containers/editor/layout/PageJumper';
import { SyncMini } from '@/containers/editor/status';
import { ZoomControl } from '@/editor/tiptap/toolbar/ZoomControl';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useEditorLive } from '@/containers/editor/session/LiveProvider';

interface StatusBarProps {
    editor: Editor | null;
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
    const { collab } = useEditorSession();
    const peerCount = useEditorLive((s) => s.peers.length);
    const stats = useReadingStats(editor);
    const targetWords = useTargetWords(collab.doc);
    const conn = useConnectionStatus(collab.provider);
    const pageNav = usePageNavigation(editor);

    const wordCount = editor?.storage.characterCount?.words() ?? 0;
    const charCount = editor?.storage.characterCount?.characters() ?? 0;
    const hasTarget = targetWords !== undefined && targetWords > 0;

    return (
        <TooltipPrimitive.Provider delayDuration={400}>
            <footer className="statusbar">
                <span>{wordCount.toLocaleString()} {t('statusbar.words')}</span>
                {hasTarget ? <WordCountTarget wordCount={wordCount} targetWords={targetWords} /> : null}
                <span>·</span>
                <span>{charCount.toLocaleString()} {t('statusbar.chars')}</span>
                <span>·</span>
                <span>{stats.paragraphs} ¶</span>
                <span>·</span>
                <span>{stats.sentences} {t('statusbar.sent')}</span>
                {peerCount === 0 ? (
                    <>
                        <span>·</span>
                        <span>{t('statusbar.soloOnline')}</span>
                    </>
                ) : null}
                <span className="statusbar-spacer" />
                <ZoomControl />
                <PageJumper current={pageNav.current} total={pageNav.total} onJump={pageNav.jumpTo} />
                <PeerAvatarStack editor={editor} />
                <SyncMini status={conn.status} onReconnect={conn.reconnect} lastSavedAt={conn.lastSavedAt} />
            </footer>
        </TooltipPrimitive.Provider>
    );
}

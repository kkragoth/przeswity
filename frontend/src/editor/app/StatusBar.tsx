import type { User } from '../identity/types';
import { ROLE_PERMISSIONS } from '../identity/types';
import { formatReadingMinutes } from './readingStats';
import type { ReadingStatsSummary } from './useReadingStats';

interface StatusBarProps {
  wordCount: number
  charCount: number
  stats: ReadingStatsSummary
  targetWords: number | undefined
  user: User
  suggestingMode: boolean
  peerCount: number
}

function targetFillColor(words: number, target: number): string {
    if (words >= target) return '#16a34a';
    if (words >= target * 0.8) return '#eab308';
    return 'var(--accent)';
}

export function StatusBar({
    wordCount,
    charCount,
    stats,
    targetWords,
    user,
    suggestingMode,
    peerCount,
}: StatusBarProps) {
    const perms = ROLE_PERMISSIONS[user.role];
    const mode = suggestingMode ? 'suggesting' : perms.canEdit ? 'editing' : 'viewing';
    return (
        <footer className="statusbar">
            <span>{wordCount.toLocaleString()} words</span>
            {targetWords && targetWords > 0 && (
                <span
                    className="word-target"
                    title={`Target: ${targetWords.toLocaleString()} words`}
                >
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
                        {Math.round((wordCount / targetWords) * 100)}% of{' '}
                        {targetWords.toLocaleString()}
                    </span>
                </span>
            )}
            <span>·</span>
            <span>{charCount.toLocaleString()} chars</span>
            <span>·</span>
            <span>{stats.paragraphs} ¶</span>
            <span>·</span>
            <span>{stats.sentences} sent</span>
            <span>·</span>
            <span>{formatReadingMinutes(stats.readingMinutes)}</span>
            <span>·</span>
            <span>role: {user.role}</span>
            <span>·</span>
            <span>mode: {mode}</span>
            <span>·</span>
            <span>
                {peerCount} {peerCount === 1 ? 'user' : 'users'} online
            </span>
        </footer>
    );
}

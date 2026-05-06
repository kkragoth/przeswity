import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';
import type { CommentThread } from '@/editor/comments/types';
import { CommentStatus } from '@/editor/comments/types';
import {
    type DiffCommentSource,
} from '@/containers/editor/versions/hooks/useDiffCommentSources';
import { DiffThreadPopover } from './DiffThreadPopover';

function openThreadsFrom(source: DiffCommentSource | null): CommentThread[] {
    if (!source) return [];
    return Array.from(source.threads.values()).filter(
        (thread) => thread.status === CommentStatus.Open,
    );
}

enum PopoverSide {
    None = 'none',
    Left = 'left',
    Right = 'right',
}

interface DiffCommentChipProps {
    leftSource: DiffCommentSource | null;
    rightSource: DiffCommentSource | null;
    leftLabel: string;
    rightLabel: string;
}

export function DiffCommentChip({ leftSource, rightSource, leftLabel, rightLabel }: DiffCommentChipProps) {
    const { t } = useTranslation('editor');
    const [open, setOpen] = useState<PopoverSide>(PopoverSide.None);

    const leftThreads = openThreadsFrom(leftSource);
    const rightThreads = openThreadsFrom(rightSource);
    const total = leftThreads.length + rightThreads.length;

    if (total === 0) return null;

    const activeThreads = open === PopoverSide.Left ? leftThreads : rightThreads;
    const activeSource = open === PopoverSide.Left ? leftSource : rightSource;
    const activeLabel = open === PopoverSide.Left ? leftLabel : rightLabel;

    const toggle = (side: PopoverSide) => setOpen((prev) => (prev === side ? PopoverSide.None : side));

    return (
        <div className="vh-comments">
            <MessageSquare size={12} className="vh-comments-icon" aria-hidden />
            {leftThreads.length > 0 && (
                <button
                    type="button"
                    className={`vh-comments-pill is-from${open === PopoverSide.Left ? ' is-open' : ''}`}
                    onClick={() => toggle(PopoverSide.Left)}
                    aria-expanded={open === PopoverSide.Left}
                    title={t('versions.commentsSide', { count: leftThreads.length, side: leftLabel })}
                >
                    {leftThreads.length}
                </button>
            )}
            {leftThreads.length > 0 && rightThreads.length > 0 && (
                <span className="vh-comments-sep">/</span>
            )}
            {rightThreads.length > 0 && (
                <button
                    type="button"
                    className={`vh-comments-pill is-to${open === PopoverSide.Right ? ' is-open' : ''}`}
                    onClick={() => toggle(PopoverSide.Right)}
                    aria-expanded={open === PopoverSide.Right}
                    title={t('versions.commentsSide', { count: rightThreads.length, side: rightLabel })}
                >
                    {rightThreads.length}
                </button>
            )}
            {open !== PopoverSide.None && activeSource && (
                <div className="vh-comments-popover-anchor">
                    <DiffThreadPopover
                        threads={activeThreads}
                        sideLabel={activeLabel}
                        kind={activeSource.kind}
                        onClose={() => setOpen(PopoverSide.None)}
                    />
                </div>
            )}
        </div>
    );
}

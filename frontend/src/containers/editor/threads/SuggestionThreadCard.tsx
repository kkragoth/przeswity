import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCheck, X } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useEditor } from '@/containers/editor/session/LiveProvider';
import { useToast } from '@/editor/shell/useToast';
import { formatRelativeTime } from '@/lib/dates';
import { acceptSuggestion, rejectSuggestion } from '@/editor/suggestions/suggestionOps';
import { addSuggestionReply } from '@/editor/suggestions/suggestionReplyOps';
import { SuggestionEntryKind, type SuggestionEntry } from '@/containers/editor/suggestions/components/SuggestionItem';
import { useSuggestionReplies } from '@/containers/editor/suggestions/useSuggestionReplies';
import { useResolvedAuthorColor } from './useResolvedAuthorColor';

interface SuggestionThreadCardProps {
    entry: SuggestionEntry;
    isActive?: boolean;
    onSelect?: () => void;
}

function SuggestionPreview({ entry }: { entry: SuggestionEntry }) {
    const { t } = useTranslation('editor');
    if (entry.kind === SuggestionEntryKind.Replace) {
        return (
            <div className="thread-suggestion-preview suggestion-text-replace">
                <span className="suggestion-text-deletion">{entry.deletedText}</span>
                <span className="suggestion-text-arrow"> → </span>
                <span className="suggestion-text-insertion">{entry.insertedText}</span>
            </div>
        );
    }
    const cls = entry.kind === SuggestionEntryKind.Insert ? 'suggestion-text-insertion' : 'suggestion-text-deletion';
    const label = entry.kind === SuggestionEntryKind.Insert ? t('suggestions.inserted') : t('suggestions.deleted');
    return (
        <div className="thread-suggestion-preview">
            <span className={cls}>{entry.text}</span>
            <span className="suggestion-text-label"> ({label})</span>
        </div>
    );
}

function kindLabel(entry: SuggestionEntry, t: ReturnType<typeof useTranslation<'editor'>>['t']): string {
    if (entry.kind === SuggestionEntryKind.Insert) return t('suggestions.inserted');
    if (entry.kind === SuggestionEntryKind.Delete) return t('suggestions.deleted');
    return t('suggestions.replaced');
}

export function SuggestionThreadCard({ entry, isActive, onSelect }: SuggestionThreadCardProps) {
    const { t, i18n } = useTranslation('editor');
    const { perms, user, collab } = useEditorSession();
    const editor = useEditor();
    const { showWithUndo } = useToast();
    const resolvedColor = useResolvedAuthorColor(entry.authorId, entry.authorColor);
    const replies = useSuggestionReplies(collab.doc, entry.suggestionId);
    const [draft, setDraft] = useState('');

    const undoEditor = () => editor?.commands.undo();

    const handleAccept = (ev: React.MouseEvent) => {
        ev.stopPropagation();
        if (!editor || !perms.canResolveSuggestion) return;
        acceptSuggestion(editor, entry.suggestionId);
        showWithUndo(t('suggestions.acceptedToast'), { label: t('suggestions.undo'), onUndo: undoEditor });
    };

    const handleReject = (ev: React.MouseEvent) => {
        ev.stopPropagation();
        if (!editor || !perms.canResolveSuggestion) return;
        rejectSuggestion(editor, entry.suggestionId);
        showWithUndo(t('suggestions.rejectedToast'), { label: t('suggestions.undo'), onUndo: undoEditor });
    };

    const handleSelect = (ev: React.MouseEvent) => {
        ev.stopPropagation();
        if (!editor) return;
        const from = entry.kind === SuggestionEntryKind.Replace
            ? Math.min(entry.deletedFrom, entry.insertedFrom)
            : entry.from;
        const to = entry.kind === SuggestionEntryKind.Replace
            ? Math.max(entry.deletedTo, entry.insertedTo)
            : entry.to;
        editor.chain().focus().setTextSelection({ from, to }).run();
        onSelect?.();
    };

    const handleSubmitReply = (ev: React.MouseEvent) => {
        ev.stopPropagation();
        const body = draft.trim();
        if (!body || !perms.canComment) return;
        addSuggestionReply(collab.doc, entry.suggestionId, { id: user.id, name: user.name, color: user.color }, body);
        setDraft('');
    };

    const relativeTime = formatRelativeTime(entry.timestamp, i18n.language, t);

    return (
        <div
            className={`thread thread--suggestion${isActive ? ' is-active' : ''}`}
            style={{ borderLeftColor: resolvedColor }}
            onClick={handleSelect}
        >
            <div className="thread-head">
                <Avatar name={entry.authorName} color={resolvedColor} size="md" ring={isActive} />
                <div className="thread-head-text">
                    <div className="thread-head-row">
                        <span className="thread-author">{entry.authorName}</span>
                        <span className="thread-role-chip thread-role-chip--suggestion">
                            {kindLabel(entry, t)}
                        </span>
                    </div>
                    <div className="thread-head-time">{relativeTime}</div>
                </div>
                <div className="thread-head-aside">
                    {replies.length > 0 && !isActive && (
                        <span className="thread-reply-count" title={t('comments.repliesCount', { count: replies.length })}>
                            ↳ {replies.length}
                        </span>
                    )}
                    {perms.canResolveSuggestion && (
                        <>
                            <button
                                type="button"
                                className="btn-resolve"
                                title={t('threads.action.accept')}
                                aria-label={t('threads.action.accept')}
                                onClick={handleAccept}
                            >
                                <CheckCheck size={13} />
                                {t('threads.action.accept')}
                            </button>
                            <button
                                type="button"
                                className="thread-icon-btn thread-remove"
                                title={t('threads.action.reject')}
                                aria-label={t('threads.action.reject')}
                                onClick={handleReject}
                            >
                                <X size={13} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            <SuggestionPreview entry={entry} />

            {isActive && (
                <div className="thread-expandable">
                    <div className="thread-expandable-inner">
                        {replies.map((reply) => (
                            <div key={reply.id} className="thread-reply">
                                <Avatar name={reply.authorName} color={reply.authorColor} size="sm" />
                                <div className="thread-reply-text">
                                    <div className="thread-head-row">
                                        <span className="thread-author">{reply.authorName}</span>
                                        <span className="thread-head-time">
                                            {formatRelativeTime(reply.createdAt, i18n.language, t)}
                                        </span>
                                    </div>
                                    <div className="thread-body">{reply.body}</div>
                                </div>
                            </div>
                        ))}
                        {perms.canComment && (
                            <div className="thread-reply-compose" onClick={(e) => e.stopPropagation()}>
                                <div className="thread-compose-row">
                                    <textarea
                                        className="thread-compose-textarea"
                                        value={draft}
                                        onChange={(e) => setDraft(e.target.value)}
                                        placeholder={t('comments.writeReply')}
                                        rows={1}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                if (draft.trim()) handleSubmitReply(e as unknown as React.MouseEvent);
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="btn-send"
                                        disabled={!draft.trim()}
                                        title={t('comments.reply')}
                                        aria-label={t('comments.reply')}
                                        onClick={handleSubmitReply}
                                    >
                                        ↑
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

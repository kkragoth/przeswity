import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCheck, MessageSquarePlus, Plus, Replace, Trash2, Type, X } from 'lucide-react';
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
import { useThreadHoverPreview } from './useThreadHoverPreview';

interface SuggestionThreadCardProps {
    entry: SuggestionEntry;
    isActive?: boolean;
    onSelect?: () => void;
}

function entryDocRange(entry: SuggestionEntry): { from: number; to: number } {
    if (entry.kind === SuggestionEntryKind.Replace) {
        return {
            from: Math.min(entry.deletedFrom, entry.insertedFrom),
            to: Math.max(entry.deletedTo, entry.insertedTo),
        };
    }
    return { from: entry.from, to: entry.to };
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
    if (entry.kind === SuggestionEntryKind.Format) {
        return (
            <div className="thread-suggestion-preview suggestion-text-format">
                {t('suggestions.format.label')}
            </div>
        );
    }
    const cls = entry.kind === SuggestionEntryKind.Insert
        ? 'suggestion-text-insertion'
        : 'suggestion-text-deletion';
    return (
        <div className="thread-suggestion-preview">
            <span className={cls}>{entry.text}</span>
        </div>
    );
}

function KindIcon({ kind }: { kind: SuggestionEntryKind }) {
    if (kind === SuggestionEntryKind.Insert) return <Plus size={11} strokeWidth={2.5} />;
    if (kind === SuggestionEntryKind.Delete) return <Trash2 size={11} strokeWidth={2.25} />;
    if (kind === SuggestionEntryKind.Format) return <Type size={11} strokeWidth={2.25} />;
    return <Replace size={11} strokeWidth={2.25} />;
}

function kindLabel(entry: SuggestionEntry, t: ReturnType<typeof useTranslation<'editor'>>['t']): string {
    if (entry.kind === SuggestionEntryKind.Insert) return t('suggestions.inserted');
    if (entry.kind === SuggestionEntryKind.Delete) return t('suggestions.deleted');
    if (entry.kind === SuggestionEntryKind.Format) return t('suggestions.format.label');
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
    const docRange = entryDocRange(entry);
    const hoverProps = useThreadHoverPreview(editor, docRange);

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

    const expand = useCallback(() => {
        if (!editor) return;
        editor.chain().focus().setTextSelection(docRange).run();
        onSelect?.();
    }, [editor, docRange, onSelect]);

    const handleCardClick = (ev: React.MouseEvent) => {
        ev.stopPropagation();
        expand();
    };

    const handleSubmitReply = (ev: React.MouseEvent) => {
        ev.stopPropagation();
        const body = draft.trim();
        if (!body || !perms.canComment) return;
        addSuggestionReply(collab.doc, entry.suggestionId, { id: user.id, name: user.name, color: user.color }, body);
        setDraft('');
    };

    const relativeTime = formatRelativeTime(entry.timestamp, i18n.language, t);
    const kLabel = kindLabel(entry, t);
    const isNew = Date.now() - entry.timestamp < 60 * 60 * 1000;

    return (
        <div
            className={`thread thread--suggestion${isActive ? ' is-active' : ''}${isNew ? ' is-new' : ''}`}
            data-thread-id={entry.suggestionId}
            style={{ borderLeftColor: resolvedColor }}
            onClick={handleCardClick}
            {...hoverProps}
        >
            <div className="thread-head">
                <Avatar name={entry.authorName} color={resolvedColor} size="md" ring={isActive} />
                <div className="thread-head-text">
                    <div className="thread-head-row">
                        <span
                            className={`thread-kind-icon thread-kind-icon--${entry.kind}`}
                            title={kLabel}
                            aria-label={kLabel}
                        >
                            <KindIcon kind={entry.kind} />
                        </span>
                        <span className="thread-author">{entry.authorName}</span>
                    </div>
                    <div className="thread-head-time">{relativeTime}</div>
                </div>
                <div className="thread-head-aside">
                    {replies.length > 0 && !isActive && (
                        <button
                            type="button"
                            className="thread-reply-count is-clickable"
                            title={t('comments.repliesCount', { count: replies.length })}
                            onClick={(e) => { e.stopPropagation(); expand(); }}
                        >
                            ↳ {replies.length}
                        </button>
                    )}
                    {perms.canComment && !isActive && replies.length === 0 && (
                        <button
                            type="button"
                            className="thread-icon-btn"
                            title={t('threads.action.reply')}
                            aria-label={t('threads.action.reply')}
                            onClick={(e) => { e.stopPropagation(); expand(); }}
                        >
                            <MessageSquarePlus size={13} />
                        </button>
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

import { BubbleMenu } from '@tiptap/react/menus';
import { CheckCheck, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
import type { EditorState } from '@tiptap/pm/state';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useToast } from '@/editor/shell/useToast';
import { acceptSuggestion, rejectSuggestion, SuggestionType } from '@/editor/suggestions/suggestionOps';

interface SuggestionBubbleProps {
    editor: Editor;
}

interface BubblePrimary {
    name: string
    color: string
    timestamp: number
}

interface BubbleAuthorInfo {
    kind: 'single' | 'multiple'
    primary: BubblePrimary
    count: number
}

function authorInfoAt(state: EditorState): BubbleAuthorInfo | null {
    const { from, to } = state.selection;
    const byAuthor = new Map<string, BubblePrimary>();

    state.doc.nodesBetween(from, to === from ? to + 1 : to, (node) => {
        for (const mark of node.marks) {
            if (
                mark.type.name !== SuggestionType.Insertion
                && mark.type.name !== SuggestionType.Deletion
            ) continue;
            const authorId = String(mark.attrs.authorId ?? '');
            if (!byAuthor.has(authorId)) {
                byAuthor.set(authorId, {
                    name: String(mark.attrs.authorName ?? ''),
                    color: String(mark.attrs.authorColor ?? ''),
                    timestamp: Number(mark.attrs.timestamp ?? 0),
                });
            }
        }
    });

    if (byAuthor.size === 0) return null;
    const entries = Array.from(byAuthor.values());
    const primary = entries.reduce((a, b) => (a.timestamp <= b.timestamp ? a : b));
    return { kind: byAuthor.size === 1 ? 'single' : 'multiple', primary, count: byAuthor.size };
}

function calcRelativeTime(ts: number): { key: string; opts?: Record<string, number> } {
    const diffMs = Date.now() - ts;
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHr = Math.floor(diffMs / 3_600_000);
    if (diffMin < 1) return { key: 'comments.time.justNow' };
    if (diffHr < 1) return { key: 'comments.time.minutesAgo', opts: { count: diffMin } };
    return { key: 'comments.time.hoursAgo', opts: { count: diffHr } };
}

function getActiveSuggestionId(editor: Editor): string | null {
    const { from, to } = editor.state.selection;
    let id: string | null = null;
    editor.state.doc.nodesBetween(from, to === from ? to + 1 : to, (node) => {
        if (id) return false;
        for (const mark of node.marks) {
            if (
                (mark.type.name === SuggestionType.Insertion || mark.type.name === SuggestionType.Deletion)
                && mark.attrs.suggestionId
            ) {
                id = mark.attrs.suggestionId as string;
                return false;
            }
        }
    });
    return id;
}

function isOnSuggestionMark(editor: Editor): boolean {
    return getActiveSuggestionId(editor) !== null;
}

export function SuggestionBubble({ editor }: SuggestionBubbleProps) {
    const { t } = useTranslation('editor');
    const { perms } = useEditorSession();
    const { showWithUndo } = useToast();

    if (!perms.canResolveSuggestion) return null;

    const handleAccept = () => {
        const id = getActiveSuggestionId(editor);
        if (!id) return;
        acceptSuggestion(editor, id);
        showWithUndo(t('suggestions.acceptedToast'), {
            label: t('suggestions.undo'),
            onUndo: () => editor.commands.undo(),
        });
    };

    const handleReject = () => {
        const id = getActiveSuggestionId(editor);
        if (!id) return;
        rejectSuggestion(editor, id);
        showWithUndo(t('suggestions.rejectedToast'), {
            label: t('suggestions.undo'),
            onUndo: () => editor.commands.undo(),
        });
    };

    const info = authorInfoAt(editor.state);
    const primaryColor = info?.primary.color ?? '';

    return (
        <BubbleMenu
            editor={editor}
            appendTo={() => document.body}
            options={{ strategy: 'fixed', placement: 'top' }}
            shouldShow={() => isOnSuggestionMark(editor)}
            className="suggestion-bubble"
            style={{ '--suggestion-color': primaryColor } as React.CSSProperties}
        >
            {info && (
                <div className="bubble-author">
                    <span style={{ color: info.primary.color }}>●</span>
                    <span>{info.primary.name || t('suggestions.unknownAuthor')}</span>
                    {info.kind === 'multiple' && <span>+{info.count - 1}</span>}
                    <span className="bubble-time">· {String(t(calcRelativeTime(info.primary.timestamp).key as never, calcRelativeTime(info.primary.timestamp).opts as never))}</span>
                </div>
            )}
            <button
                type="button"
                className="suggestion-bubble-btn suggestion-bubble-accept"
                onClick={handleAccept}
                title={t('threads.action.accept')}
            >
                <CheckCheck size={13} />
                {t('threads.action.accept')}
            </button>
            <div className="suggestion-bubble-sep" />
            <button
                type="button"
                className="suggestion-bubble-btn suggestion-bubble-reject"
                onClick={handleReject}
                title={t('threads.action.reject')}
            >
                <X size={13} />
                {t('threads.action.reject')}
            </button>
        </BubbleMenu>
    );
}

import { BubbleMenu } from '@tiptap/react/menus';
import { CheckCheck, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useToast } from '@/editor/shell/useToast';
import { acceptSuggestion, rejectSuggestion, SuggestionType } from '@/editor/suggestions/suggestionOps';

interface SuggestionBubbleProps {
    editor: Editor;
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

    return (
        <BubbleMenu
            editor={editor}
            appendTo={() => document.body}
            options={{ strategy: 'fixed', placement: 'top' }}
            shouldShow={() => isOnSuggestionMark(editor)}
            className="suggestion-bubble"
        >
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

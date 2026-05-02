import { useEditor } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { useMemo } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { buildExtensions } from '@/editor/tiptap/extensions';
import type { CollabBundle } from '@/editor/collab/yDoc';
import type { User } from '@/editor/identity/types';
import type { DragState } from '@/editor/tiptap/hooks/useBlockDragDrop';
import type { SlashTriggerInfo } from '@/editor/tiptap/slash/SlashCommand';
import type { EditorContextHandle } from '@/editor/tiptap/editorContext';

export function useEditorInit(props: {
    collab: CollabBundle;
    user: User;
    placeholder: string;
    canEditOrSuggest: boolean;
    ctx: EditorContextHandle;
    dragStateRef: MutableRefObject<DragState>;
    resetDrag: () => void;
    setSlashTrigger: Dispatch<SetStateAction<SlashTriggerInfo>>;
    onActiveCommentChange: (commentId: string | null) => void;
    onUpdate?: (editor: Editor) => void;
    onSelection?: (editor: Editor) => void;
}): { editor: Editor | null; ready: boolean } {
    const extensions = useMemo(() => buildExtensions({
        collab: props.collab,
        user: props.user,
        onCommentClick: props.onActiveCommentChange,
        onSlashTrigger: props.setSlashTrigger,
        getSuggestingEnabled: () => props.ctx.get().suggesting,
        getSuggestionAuthor: () => {
            const u = props.ctx.get().user;
            return { id: u.id, name: u.name, color: u.color };
        },
        getGlossaryEntries: () => props.ctx.get().glossary,
        getOnHeaderClick: () => props.ctx.get().onHeaderClick,
        getOnFooterClick: () => props.ctx.get().onFooterClick,
    }), [props.collab, props.user, props.onActiveCommentChange, props.setSlashTrigger, props.ctx]);

    const editor = useEditor({
        extensions,
        editorProps: {
            attributes: { class: 'prose-editor', spellcheck: 'true' },
            handleClickOn: (_view, _pos, _node, _nodePos, event) => {
                const target = event.target as HTMLElement;
                const anchor = target.closest('[data-comment-id]') as HTMLElement | null;
                const id = anchor?.getAttribute('data-comment-id');
                if (id) props.onActiveCommentChange(id);
                return false;
            },
            handlePaste: (view, event) => {
                const items = event.clipboardData?.items;
                if (!items) return false;
                for (const item of Array.from(items)) {
                    if (!item.type.startsWith('image/')) continue;
                    const file = item.getAsFile();
                    if (!file) continue;
                    const reader = new FileReader();
                    reader.onload = () => view.dispatch(view.state.tr.replaceSelectionWith(view.state.schema.nodes.image.create({ src: reader.result as string })));
                    reader.readAsDataURL(file);
                    return true;
                }
                return false;
            },
            handleDrop: (view, event) => {
                if (props.dragStateRef.current.active) {
                    event.preventDefault();
                    const { from, to, insertAt } = props.dragStateRef.current;
                    props.resetDrag();
                    if (insertAt === null || (insertAt >= from && insertAt <= to)) return true;
                    try {
                        const $target = view.state.doc.resolve(insertAt);
                        if ($target.depth !== 0) return true;
                        const tr = view.state.tr.delete(from, to);
                        tr.insert(tr.mapping.map(insertAt, -1), view.state.doc.slice(from, to).content);
                        view.dispatch(tr);
                    } catch (err) {
                        console.error('block move failed:', err);
                    }
                    return true;
                }
                const dt = event.dataTransfer;
                if (!dt || !dt.files.length) return false;
                const file = Array.from(dt.files).find((f) => f.type.startsWith('image/'));
                if (!file) return false;
                event.preventDefault();
                const reader = new FileReader();
                reader.onload = () => {
                    const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.from;
                    view.dispatch(view.state.tr.insert(pos, view.state.schema.nodes.image.create({ src: reader.result as string })));
                };
                reader.readAsDataURL(file);
                return true;
            },
        },
        editable: props.canEditOrSuggest,
        onUpdate: ({ editor: e }) => props.onUpdate?.(e),
        onSelectionUpdate: ({ editor: e }) => props.onSelection?.(e),
    }, [props.collab, props.user.id]);

    return { editor, ready: Boolean(editor) };
}

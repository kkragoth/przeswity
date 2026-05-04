import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EditorContent } from '@tiptap/react';

import { BubbleToolbar } from '@/editor/tiptap/BubbleToolbar';
import { BlockMenu } from '@/editor/tiptap/BlockMenu';
import { HeaderFooterBar, HeaderFooterKind } from '@/editor/tiptap/HeaderFooterBar';
import { ContextMenu } from '@/editor/shell/ContextMenu';
import { CommentAnchors } from '@/containers/editor/components/comments/CommentAnchors';
import { DragHandle } from '@/editor/tiptap/blocks/DragHandle';
import { SlashMenu } from '@/editor/tiptap/slash/SlashMenu';
import { EMPTY_SLASH, type EditorViewProps, type SlashTriggerInfo } from '@/editor/tiptap/types';

import { useBlockHover } from '@/editor/tiptap/hooks/useBlockHover';
import { useBlockDrag, useBlockDragOver } from '@/editor/tiptap/hooks/useBlockDragDrop';
import { useAwarenessSync } from '@/editor/tiptap/hooks/useAwarenessSync';
import { useCommentScrollPulse } from '@/editor/tiptap/hooks/useCommentScrollPulse';
import { useHeaderFooterSync } from '@/editor/tiptap/hooks/useHeaderFooterSync';
import { useEditorContextMenu } from '@/editor/tiptap/hooks/useEditorContextMenu';
import { useEditorInit } from '@/editor/tiptap/hooks/useEditorInit';
import { useBlockMenu } from '@/editor/tiptap/hooks/useBlockMenu';
import { addCommentFromBubble, focusOnEmptyClick } from '@/editor/tiptap/hooks/useEditorInteractions';
import { createEditorContext } from '@/editor/tiptap/editorContext';
import { useEditorSession } from '@/containers/editor/EditorSessionProvider';
import { useEditorLive, useSetEditor } from '@/containers/editor/EditorLiveProvider';
import { useSession } from '@/containers/editor/SessionStoreProvider';

export function EditorView({
    collab,
    glossaryEntries,
    onActiveCommentChange,
    onCreateComment,
}: EditorViewProps) {
    const { t } = useTranslation('editor');
    const { user, perms, toast } = useEditorSession();
    const setEditorInStore = useSetEditor();
    const suggestingMode = useEditorLive((s) => s.suggesting.effective);
    const activeCommentId = useSession((s) => s.activeCommentId);

    // Single context cell replacing 5 mutable refs — initialized before first useEditor call.
    const ctx = useMemo(() => createEditorContext({
        user,
        suggesting: suggestingMode,
        glossary: glossaryEntries,
    }), []); // eslint-disable-line react-hooks/exhaustive-deps

    // Keep snapshot in sync before any TipTap event handlers can fire on this render.
    useLayoutEffect(() => {
        ctx.update({
            ...ctx.get(),
            user,
            suggesting: suggestingMode,
            glossary: glossaryEntries,
        });
    });

    const canEditOrSuggest = perms.canEdit || perms.canSuggest;

    const blockMenu = useBlockMenu();
    const [slashTrigger, setSlashTrigger] = useState<SlashTriggerInfo>(EMPTY_SLASH);
    const { dragStateRef, dropTop, setDropTop, resetDrag } = useBlockDrag();

    const { editor } = useEditorInit({
        collab,
        user,
        placeholder: '',
        canEditOrSuggest,
        ctx,
        dragStateRef,
        resetDrag,
        setSlashTrigger,
        onActiveCommentChange,
    });

    const { headerFooterFocus, setHeaderFooterFocus, applyHeaderFooter } = useHeaderFooterSync({ collab, editor, ctx });
    const { contextMenu, setContextMenu } = useEditorContextMenu({ editor, collab, ctx, onCreateComment, onActiveCommentChange });

    useEffect(() => { if (editor) editor.setEditable(canEditOrSuggest); }, [editor, canEditOrSuggest]);
    useEffect(() => {
        setEditorInStore(editor ?? null);
        return () => setEditorInStore(null);
    }, [editor, setEditorInStore]);

    useAwarenessSync(editor, collab.provider, user);
    const hoveredBlock = useBlockHover(editor);
    useBlockDragOver(editor, dragStateRef, setDropTop);
    useCommentScrollPulse(editor, activeCommentId);

    const showHeaderFooterBar = editor && headerFooterFocus.kind !== HeaderFooterKind.None;
    const showDragHandle = editor && hoveredBlock && canEditOrSuggest;

    return (
        <div className={`editor-shell${suggestingMode ? ' is-suggesting' : ''}`}>
            {showHeaderFooterBar ? (
                <HeaderFooterBar
                    kind={headerFooterFocus.kind}
                    left={headerFooterFocus.left}
                    right={headerFooterFocus.right}
                    onApply={(left, right) => applyHeaderFooter(headerFooterFocus.kind as HeaderFooterKind.Header | HeaderFooterKind.Footer, left, right)}
                    onDismiss={() => setHeaderFooterFocus({ kind: HeaderFooterKind.None })}
                />
            ) : null}
            <div className="editor-scroll">
                <div className="editor-page" onMouseDown={(e) => focusOnEmptyClick(e, editor, canEditOrSuggest)}>
                    <EditorContent editor={editor} />
                    <CommentAnchors
                        editor={editor}
                        doc={collab.doc}
                        activeCommentId={activeCommentId}
                        onSelect={onActiveCommentChange}
                    />
                    {showDragHandle ? (
                        <DragHandle
                            editor={editor}
                            hovered={hoveredBlock}
                            dragStateRef={dragStateRef}
                            onClickMenu={(pos, anchor) => blockMenu.openFor(anchor, pos)}
                            onDragEnd={resetDrag}
                        />
                    ) : null}
                    {dropTop !== null ? <div className="drop-indicator" style={{ top: dropTop }} /> : null}
                </div>
            </div>
            {editor ? (
                <BubbleToolbar
                    editor={editor}
                    canComment={perms.canComment}
                    onAddComment={() => addCommentFromBubble(editor, onCreateComment)}
                />
            ) : null}
            {contextMenu ? (
                <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />
            ) : null}
            {editor && slashTrigger.active ? (
                <SlashMenu editor={editor} trigger={slashTrigger} onClose={() => setSlashTrigger(EMPTY_SLASH)} onToast={toast} />
            ) : null}
            {editor ? <BlockMenu state={blockMenu} editor={editor} t={t} /> : null}
        </div>
    );
}

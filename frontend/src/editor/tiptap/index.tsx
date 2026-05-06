import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EditorContent } from '@tiptap/react';

import { BubbleToolbar } from '@/editor/tiptap/canvas/BubbleToolbar';
import { BlockMenu } from '@/editor/tiptap/canvas/BlockMenu';
import { HeaderFooterBar, HeaderFooterKind } from '@/editor/tiptap/headerFooter/HeaderFooterBar';
import { ContextMenu } from '@/editor/shell/ContextMenu';
import { CommentAnchors } from '@/containers/editor/comments/CommentAnchors';
import { DragHandle } from '@/editor/tiptap/canvas/DragHandle';
import { SlashMenu } from '@/editor/tiptap/slash/SlashMenu';
import { EMPTY_SLASH, type EditorViewProps, type SlashTriggerInfo } from '@/editor/tiptap/types';

import { useBlockHover } from '@/editor/tiptap/blocks/useBlockHover';
import { useBlockDrag, useBlockDragOver } from '@/editor/tiptap/blocks/useBlockDragDrop';
import { useAwarenessSync } from '@/editor/tiptap/hooks/useAwarenessSync';
import {
    useActiveCommentMarkClass,
    useCommentScrollPulse,
    useResolvedCommentMarkClass,
} from '@/editor/tiptap/hooks/useCommentScrollPulse';
import { useCommentThreads } from '@/editor/comments/useCommentThreads';
import { useHeaderFooterSync } from '@/editor/tiptap/headerFooter/useHeaderFooterSync';
import { useEditorContextMenu } from '@/editor/tiptap/hooks/useEditorContextMenu';
import { useEditorInit } from '@/editor/tiptap/hooks/useEditorInit';
import { useBlockMenu } from '@/editor/tiptap/blocks/useBlockMenu';
import { addCommentFromBubble, focusOnEmptyClick } from '@/editor/tiptap/hooks/useEditorInteractions';
import { createEditorContext } from '@/editor/tiptap/editorContext';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useEditorLive, useSetEditor } from '@/containers/editor/session/LiveProvider';
import { useSession } from '@/containers/editor/SessionStoreProvider';
import { useCommentsStore } from '@/containers/editor/comments/store/CommentsStoreProvider';
import { useEditorZoom } from '@/contexts/EditorZoomContext';

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
    const commentPulseTick = useSession((s) => s.commentPulseTick);

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

    const commentsStore = useCommentsStore();
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
        onCommentOrphan: (id, quote) => commentsStore.getState().markOrphan(id, quote),
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
    const allThreads = useCommentThreads(collab.doc);
    useCommentScrollPulse(editor, activeCommentId, commentPulseTick);
    useActiveCommentMarkClass(editor, activeCommentId);
    useResolvedCommentMarkClass(editor, allThreads);

    const showHeaderFooterBar = editor && headerFooterFocus.kind !== HeaderFooterKind.None;
    const showDragHandle = editor && hoveredBlock && canEditOrSuggest;

    const { zoom } = useEditorZoom();
    const pageRef = useRef<HTMLDivElement | null>(null);
    const frameRef = useRef<HTMLDivElement | null>(null);
    useLayoutEffect(() => {
        const page = pageRef.current;
        const frame = frameRef.current;
        if (!page || !frame) return;
        const apply = () => {
            frame.style.width = `${page.offsetWidth * zoom}px`;
            frame.style.height = `${page.offsetHeight * zoom}px`;
        };
        apply();
        const ro = new ResizeObserver(apply);
        ro.observe(page);
        return () => ro.disconnect();
    }, [zoom]);

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
                <div className="editor-zoom-frame" ref={frameRef}>
                    <div
                        className="editor-page"
                        ref={pageRef}
                        onMouseDown={(e) => focusOnEmptyClick(e, editor, canEditOrSuggest)}
                    >
                        <EditorContent editor={editor} />
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
                    {/* Pins live in the zoom-frame (sibling of `.editor-page`)
                        so they anchor right next to the page edge — not far
                        at the editor-shell gutter — while still staying
                        outside the page's `transform: scale` (so the cards
                        don't scale with editor zoom). The frame is part of
                        scroll content, so pins scroll with the doc naturally,
                        no scroll listener needed. */}
                    <CommentAnchors
                        editor={editor}
                        doc={collab.doc}
                        activeCommentId={activeCommentId}
                        onSelect={onActiveCommentChange}
                    />
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

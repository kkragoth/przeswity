import { EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import type { Dispatch, MouseEvent, MutableRefObject, SetStateAction } from 'react';
import { BubbleToolbar } from '@/editor/tiptap/BubbleToolbar';
import { BlockMenu } from '@/editor/tiptap/BlockMenu';
import { HeaderFooterBar, HeaderFooterKind } from '@/editor/tiptap/HeaderFooterBar';
import type { HeaderFooterFocus } from '@/editor/tiptap/hooks/useHeaderFooterSync';
import { ContextMenu } from '@/editor/shell/ContextMenu';
import { CommentAnchors } from '@/containers/editor/components/comments/CommentAnchors';
import { DragHandle } from '@/editor/tiptap/blocks/DragHandle';
import { SlashMenu } from '@/editor/tiptap/slash/SlashMenu';
import type { SlashTriggerInfo } from '@/editor/tiptap/slash/SlashCommand';
import type { useBlockMenu } from '@/editor/tiptap/hooks/useBlockMenu';
import type { User } from '@/editor/identity/types';
import type { ContextMenuState } from '@/editor/tiptap/hooks/useEditorContextMenu';
import type { HoveredBlock } from '@/editor/tiptap/hooks/useBlockHover';
import type { DragState } from '@/editor/tiptap/hooks/useBlockDragDrop';
import type { CollabBundle } from '@/editor/collab/yDoc';

const EMPTY_SLASH: SlashTriggerInfo = { active: false, query: '', coords: null, range: null };

export function EditorCanvas(props: {
    editor: Editor | null;
    collab: CollabBundle;
    user: User;
    perms: { canComment: boolean };
    suggestingMode: boolean;
    activeCommentId: string | null;
    onActiveCommentChange: (commentId: string | null) => void;
    addCommentFromBubble: () => void;
    canEditOrSuggest: boolean;
    hoveredBlock: HoveredBlock | null;
    dragStateRef: MutableRefObject<DragState>;
    resetDrag: () => void;
    dropTop: number | null;
    blockMenu: ReturnType<typeof useBlockMenu>;
    contextMenu: ContextMenuState | null;
    setContextMenu: (s: ContextMenuState | null) => void;
    slashTrigger: SlashTriggerInfo;
    setSlashTrigger: (s: SlashTriggerInfo) => void;
    onToast?: (msg: string, kind?: 'info' | 'success' | 'error') => void;
    t: (...args: any[]) => string;
    headerFooterFocus: HeaderFooterFocus;
    applyHeaderFooter: (kind: HeaderFooterKind.Header | HeaderFooterKind.Footer, left: string, right: string) => void;
    setHeaderFooterFocus: Dispatch<SetStateAction<HeaderFooterFocus>>;
    focusOnEmptyClick: (e: MouseEvent<HTMLDivElement>) => void;
}) {
    const { editor } = props;
    return (
        <div className={`editor-shell${props.suggestingMode ? ' is-suggesting' : ''}`}>
            {editor && props.headerFooterFocus.kind !== HeaderFooterKind.None ? (
                <HeaderFooterBar
                    kind={props.headerFooterFocus.kind}
                    left={props.headerFooterFocus.left}
                    right={props.headerFooterFocus.right}
                    onApply={(left, right) => props.applyHeaderFooter(props.headerFooterFocus.kind as HeaderFooterKind.Header | HeaderFooterKind.Footer, left, right)}
                    onDismiss={() => props.setHeaderFooterFocus({ kind: HeaderFooterKind.None })}
                />
            ) : null}
            <div className="editor-scroll">
                <div className="editor-page" onMouseDown={props.focusOnEmptyClick}>
                    <EditorContent editor={editor} />
                    <CommentAnchors editor={editor} doc={props.collab.doc} activeCommentId={props.activeCommentId} onSelect={props.onActiveCommentChange} />
                    {editor && props.hoveredBlock && props.canEditOrSuggest ? (
                        <DragHandle
                            editor={editor}
                            hovered={props.hoveredBlock}
                            dragStateRef={props.dragStateRef}
                            onClickMenu={(pos, anchor) => props.blockMenu.openFor(anchor, pos)}
                            onDragEnd={props.resetDrag}
                        />
                    ) : null}
                    {props.dropTop !== null ? <div className="drop-indicator" style={{ top: props.dropTop }} /> : null}
                </div>
            </div>
            {editor ? <BubbleToolbar editor={editor} canComment={props.perms.canComment} onAddComment={props.addCommentFromBubble} /> : null}
            {props.contextMenu ? <ContextMenu x={props.contextMenu.x} y={props.contextMenu.y} items={props.contextMenu.items} onClose={() => props.setContextMenu(null)} /> : null}
            {editor && props.slashTrigger.active ? <SlashMenu editor={editor} trigger={props.slashTrigger} onClose={() => props.setSlashTrigger(EMPTY_SLASH)} onToast={props.onToast} /> : null}
            {editor ? <BlockMenu state={props.blockMenu} editor={editor} t={props.t} /> : null}
        </div>
    );
}

import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';

import { Toolbar } from './Toolbar';
import { BubbleToolbar } from './BubbleToolbar';
import { HeaderFooterBar, HeaderFooterKind } from '@/editor/editor/HeaderFooterBar';
import { ContextMenu } from '@/editor/shell/ContextMenu';
import { CommentAnchors } from '@/editor/comments/CommentAnchors';
import { DragHandle } from './blocks/DragHandle';
import { moveBlock, duplicateBlock, deleteBlock } from './blocks/blockOps';
import { SlashMenu } from './slash/SlashMenu';
import type { SlashTriggerInfo } from './slash/SlashCommand';
import type { GlossaryEntry } from '@/editor/glossary/GlossaryHighlight';

import type { HeaderClickEvent, FooterClickEvent } from 'tiptap-pagination-plus';
import { buildExtensions } from './extensions';

import { useBlockHover } from './useBlockHover';
import { useBlockDragOver, INITIAL_DRAG_STATE, type DragState } from './useBlockDragDrop';
import { useCommentScrollPulse } from './useCommentScrollPulse';
import { useHeaderFooterSync } from './useHeaderFooterSync';
import { useEditorContextMenu } from './useEditorContextMenu';

import type { CollabBundle } from '@/editor/collab/yDoc';
import type { User } from '@/editor/identity/types';
import { ROLE_PERMISSIONS } from '@/editor/identity/types';
import type { PaneState } from '@/editor/app/usePaneState';

export interface EditorViewProps {
  collab: CollabBundle
  user: User
  suggestingMode: boolean
  suggestingForced?: boolean
  onSuggestingModeChange?: (mode: boolean) => void
  activeCommentId: string | null
  glossaryEntries: GlossaryEntry[]
  onActiveCommentChange: (commentId: string | null) => void
  onCreateComment: (commentId: string, originalQuote: string) => void
  onEditorReady: (editor: Editor) => void
  onToast?: (msg: string, kind?: 'info' | 'success' | 'error') => void
  leftPaneState?: PaneState
  rightPaneState?: PaneState
  leftPaneTab?: string
  rightPaneTab?: string
  onToggleLeftPane?: () => void
  onToggleRightPane?: () => void
}

interface BlockMenuState {
  x: number
  y: number
  pos: number
}

const EMPTY_SLASH: SlashTriggerInfo = {
    active: false,
    query: '',
    coords: null,
    range: null,
};

function makeId(): string {
    return Math.random().toString(36).slice(2, 11);
}

export function EditorView({
    collab,
    user,
    suggestingMode,
    suggestingForced = false,
    onSuggestingModeChange,
    activeCommentId,
    glossaryEntries,
    onActiveCommentChange,
    onCreateComment,
    onEditorReady,
    onToast,
    leftPaneState,
    rightPaneState,
    leftPaneTab,
    rightPaneTab,
    onToggleLeftPane,
    onToggleRightPane,
}: EditorViewProps) {
    const { t } = useTranslation('editor');

    // Live refs so extension getters never see stale closure values
    const userRef = useRef(user);
    userRef.current = user;
    const suggestingRef = useRef(suggestingMode);
    suggestingRef.current = suggestingMode;
    const glossaryRef = useRef(glossaryEntries);
    glossaryRef.current = glossaryEntries;

    const perms = ROLE_PERMISSIONS[user.role];
    const canEditOrSuggest = perms.canEdit || perms.canSuggest;

    const [blockMenu, setBlockMenu] = useState<BlockMenuState | null>(null);
    const [slashTrigger, setSlashTrigger] = useState<SlashTriggerInfo>(EMPTY_SLASH);

    const dragStateRef = useRef<DragState>({ ...INITIAL_DRAG_STATE });
    const [dropTop, setDropTop] = useState<number | null>(null);
    const resetDrag = () => {
        dragStateRef.current = { ...INITIAL_DRAG_STATE };
        setDropTop(null);
    };

    // Stable refs captured by PaginationPlus on extension build — updated each render by the sync hook
    const onHeaderClickRef = useRef<(() => void) | undefined>(undefined);
    const onFooterClickRef = useRef<(() => void) | undefined>(undefined);

    const editor = useEditor(
        {
            extensions: buildExtensions({
                collab,
                user,
                onCommentClick: onActiveCommentChange,
                onSlashTrigger: setSlashTrigger,
                getSuggestingEnabled: () => suggestingRef.current,
                getSuggestionAuthor: () => ({
                    id: userRef.current.id,
                    name: userRef.current.name,
                    color: userRef.current.color,
                }),
                getGlossaryEntries: () => glossaryRef.current,
                getOnHeaderClick: (): HeaderClickEvent => (_params) => onHeaderClickRef.current?.(),
                getOnFooterClick: (): FooterClickEvent => (_params) => onFooterClickRef.current?.(),
            }),
            editorProps: {
                attributes: { class: 'prose-editor', spellcheck: 'true' },
                handleClickOn: (_view, _pos, _node, _nodePos, event) => {
                    const target = event.target as HTMLElement;
                    const anchor = target.closest('[data-comment-id]') as HTMLElement | null;
                    const id = anchor?.getAttribute('data-comment-id');
                    if (id) onActiveCommentChange(id);
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
                        reader.onload = () => {
                            const url = reader.result as string;
                            view.dispatch(
                                view.state.tr.replaceSelectionWith(
                                    view.state.schema.nodes.image.create({ src: url }),
                                ),
                            );
                        };
                        reader.readAsDataURL(file);
                        return true;
                    }
                    return false;
                },
                handleDrop: (view, event) => {
                    if (dragStateRef.current.active) {
                        event.preventDefault();
                        const { from, to, insertAt } = dragStateRef.current;
                        resetDrag();
                        if (insertAt === null) return true;
                        if (insertAt >= from && insertAt <= to) return true;
                        try {
                            const $target = view.state.doc.resolve(insertAt);
                            if ($target.depth !== 0) return true;
                            const slice = view.state.doc.slice(from, to);
                            const tr = view.state.tr.delete(from, to);
                            const mapped = tr.mapping.map(insertAt, -1);
                            tr.insert(mapped, slice.content);
                            view.dispatch(tr);
                        } catch (err) {
                            console.error('block move failed:', err);
                        }
                        return true;
                    }
                    // Image-file drop fallback
                    const dt = event.dataTransfer;
                    if (!dt || !dt.files.length) return false;
                    const file = Array.from(dt.files).find((f) => f.type.startsWith('image/'));
                    if (!file) return false;
                    event.preventDefault();
                    const reader = new FileReader();
                    reader.onload = () => {
                        const url = reader.result as string;
                        const pos =
              view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ??
              view.state.selection.from;
                        view.dispatch(
                            view.state.tr.insert(pos, view.state.schema.nodes.image.create({ src: url })),
                        );
                    };
                    reader.readAsDataURL(file);
                    return true;
                },
            },
            editable: canEditOrSuggest,
        },
        [collab, user.id],
    );

    const { headerFooterFocus, setHeaderFooterFocus, applyHeaderFooter } = useHeaderFooterSync({
        collab,
        editor,
        onHeaderClickRef,
        onFooterClickRef,
    });

    const { contextMenu, setContextMenu } = useEditorContextMenu({
        editor,
        collab,
        userRef,
        onCreateComment,
        onActiveCommentChange,
    });

    useEffect(() => {
        if (editor) editor.setEditable(canEditOrSuggest);
    }, [editor, canEditOrSuggest]);

    useEffect(() => {
        if (editor) onEditorReady(editor);
    }, [editor, onEditorReady]);

    // Awareness: keep our user info in sync with provider
    useEffect(() => {
        if (!editor) return;
        collab.provider.awareness?.setLocalStateField('user', {
            name: user.name,
            color: user.color,
        });
    }, [collab.provider, editor, user.name, user.color]);

    // Block-handle hover state + drag-over indicator — both install once editor is ready
    const hoveredBlock = useBlockHover(editor);
    useBlockDragOver(editor, dragStateRef, setDropTop);

    useCommentScrollPulse(editor, activeCommentId);

    const addCommentFromBubble = () => {
        if (!editor) return;
        const { from, to } = editor.state.selection;
        if (from === to) return;
        const id = makeId();
        const quote = editor.state.doc.textBetween(from, to, ' ');
        editor.chain().focus().setComment(id).run();
        onCreateComment(id, quote);
    };

    const blockMenuItems = blockMenu
        ? [
            {
                label: t('blockMenu.moveUp'),
                icon: '↑',
                shortcut: '⌥⇧↑',
                action: () => moveBlock(editor!, blockMenu.pos, 'up'),
            },
            {
                label: t('blockMenu.moveDown'),
                icon: '↓',
                shortcut: '⌥⇧↓',
                action: () => moveBlock(editor!, blockMenu.pos, 'down'),
            },
            { label: '', separator: true },
            {
                label: t('blockMenu.duplicate'),
                icon: '⎘',
                shortcut: '⌘D',
                action: () => duplicateBlock(editor!, blockMenu.pos),
            },
            { label: '', separator: true },
            {
                label: t('blockMenu.deleteBlock'),
                icon: '🗑',
                danger: true,
                action: () => deleteBlock(editor!, blockMenu.pos),
            },
        ]
        : [];

    const focusOnEmptyClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!editor || !canEditOrSuggest) return;
        const target = e.target as HTMLElement;
        // Let clicks inside the editable content, comments, drag handles, or any interactive child handle themselves.
        if (target.closest('.prose-editor, [data-comment-id], .drag-handle, button, a, input, textarea')) return;
        e.preventDefault();
        editor.commands.focus('end');
    };

    return (
        <div className={`editor-shell${suggestingMode ? ' is-suggesting' : ''}`}>
            {editor && (
                <Toolbar
                    editor={editor}
                    user={user}
                    suggestingMode={suggestingMode}
                    suggestingForced={suggestingForced}
                    onSuggestingModeChange={onSuggestingModeChange ?? (() => {})}
                    onToast={onToast ?? (() => {})}
                    leftPaneState={leftPaneState ?? 'expanded'}
                    rightPaneState={rightPaneState ?? 'expanded'}
                    leftPaneTab={leftPaneTab ?? ''}
                    rightPaneTab={rightPaneTab ?? ''}
                    onToggleLeftPane={onToggleLeftPane ?? (() => {})}
                    onToggleRightPane={onToggleRightPane ?? (() => {})}
                />
            )}
            {editor && headerFooterFocus.kind !== HeaderFooterKind.None && (
                <HeaderFooterBar
                    kind={headerFooterFocus.kind}
                    left={headerFooterFocus.left}
                    right={headerFooterFocus.right}
                    onApply={(left, right) =>
                        applyHeaderFooter(
                            headerFooterFocus.kind as HeaderFooterKind.Header | HeaderFooterKind.Footer,
                            left,
                            right,
                        )
                    }
                    onDismiss={() => setHeaderFooterFocus({ kind: HeaderFooterKind.None })}
                />
            )}
            <div className="editor-scroll">
                <div className="editor-page" onMouseDown={focusOnEmptyClick}>
                    <EditorContent editor={editor} />
                    <CommentAnchors
                        editor={editor}
                        doc={collab.doc}
                        activeCommentId={activeCommentId}
                        onSelect={onActiveCommentChange}
                    />
                    {editor && hoveredBlock && canEditOrSuggest && (
                        <DragHandle
                            editor={editor}
                            hovered={hoveredBlock}
                            dragStateRef={dragStateRef}
                            onClickMenu={(pos, anchor) => {
                                setBlockMenu({ x: anchor.right + 6, y: anchor.top, pos });
                            }}
                            onDragEnd={resetDrag}
                        />
                    )}
                    {dropTop !== null && <div className="drop-indicator" style={{ top: dropTop }} />}
                </div>
            </div>
            {editor && (
                <BubbleToolbar
                    editor={editor}
                    canComment={perms.canComment}
                    onAddComment={addCommentFromBubble}
                />
            )}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={contextMenu.items}
                    onClose={() => setContextMenu(null)}
                />
            )}
            {editor && slashTrigger.active && (
                <SlashMenu
                    editor={editor}
                    trigger={slashTrigger}
                    onClose={() => setSlashTrigger(EMPTY_SLASH)}
                    onToast={onToast}
                />
            )}
            {blockMenu && editor && (
                <ContextMenu
                    x={blockMenu.x}
                    y={blockMenu.y}
                    items={blockMenuItems}
                    onClose={() => setBlockMenu(null)}
                />
            )}
        </div>
    );
}

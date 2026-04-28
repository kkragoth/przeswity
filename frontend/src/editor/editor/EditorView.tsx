import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';

import { Toolbar } from './Toolbar';
import { BubbleToolbar } from './BubbleToolbar';
import { HeaderFooterBar, HeaderFooterKind } from '@/editor/editor/HeaderFooterBar';
import { ContextMenu } from '../shell/ContextMenu';
import type { ContextMenuItem } from '../shell/ContextMenu';
import { CommentAnchors } from '../comments/CommentAnchors';
import { DragHandle } from './blocks/DragHandle';
import { moveBlock, duplicateBlock, deleteBlock } from './blocks/blockOps';
import { SlashMenu } from './slash/SlashMenu';
import type { SlashTriggerInfo } from './slash/SlashCommand';
import type { GlossaryEntry } from '../glossary/GlossaryHighlight';

import type { HeaderClickEvent, FooterClickEvent } from 'tiptap-pagination-plus';
import { buildExtensions } from './extensions';

// PaginationPlus augments Commands but the module augmentation may not propagate
// through all tsconfig paths — cast to access the added commands safely.
interface PaginationCommands {
    updateHeaderContent: (left: string, right: string) => boolean;
    updateFooterContent: (left: string, right: string) => boolean;
}
function paginationCmds(editor: Editor) {
    return editor.commands as unknown as PaginationCommands;
}
import { buildContextItems } from './contextItems';
import { useBlockHover } from './useBlockHover';
import { useBlockDragOver, INITIAL_DRAG_STATE, type DragState } from './useBlockDragDrop';
import { useCommentScrollPulse } from './useCommentScrollPulse';

import type { CollabBundle } from '../collab/yDoc';
import type { User } from '../identity/types';
import { ROLE_PERMISSIONS } from '../identity/types';

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
}

interface ContextMenuState {
  x: number
  y: number
  items: ContextMenuItem[]
}

interface BlockMenuState {
  x: number
  y: number
  pos: number
}

type HeaderFooterFocus =
    | { kind: HeaderFooterKind.Header; left: string; right: string }
    | { kind: HeaderFooterKind.Footer; left: string; right: string }
    | { kind: 'none' };

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

    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [blockMenu, setBlockMenu] = useState<BlockMenuState | null>(null);
    const [slashTrigger, setSlashTrigger] = useState<SlashTriggerInfo>(EMPTY_SLASH);
    const [headerFooterFocus, setHeaderFooterFocus] = useState<HeaderFooterFocus>({ kind: 'none' });

    const dragStateRef = useRef<DragState>({ ...INITIAL_DRAG_STATE });
    const [dropTop, setDropTop] = useState<number | null>(null);
    const resetDrag = () => {
        dragStateRef.current = { ...INITIAL_DRAG_STATE };
        setDropTop(null);
    };

    // Stable refs so PaginationPlus callbacks always call the latest handler without re-creating extensions
    const onHeaderClickRef = useRef<(() => void) | undefined>(undefined);
    const onFooterClickRef = useRef<(() => void) | undefined>(undefined);
    onHeaderClickRef.current = () => {
        const meta = collab.doc.getMap<string>('meta');
        setHeaderFooterFocus({
            kind: HeaderFooterKind.Header,
            left: meta.get('headerLeft') ?? '',
            right: meta.get('headerRight') ?? '',
        });
    };
    onFooterClickRef.current = () => {
        const meta = collab.doc.getMap<string>('meta');
        setHeaderFooterFocus({
            kind: HeaderFooterKind.Footer,
            left: meta.get('footerLeft') ?? '',
            right: meta.get('footerRight') ?? '{page}',
        });
    };

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

    // Sync Yjs meta map → PaginationPlus header/footer content
    useEffect(() => {
        if (!editor) return;
        const meta = collab.doc.getMap<string>('meta');
        const syncHeaderFooter = () => {
            paginationCmds(editor).updateHeaderContent(meta.get('headerLeft') ?? '', meta.get('headerRight') ?? '');
            paginationCmds(editor).updateFooterContent(meta.get('footerLeft') ?? '', meta.get('footerRight') ?? '{page}');
        };
        meta.observe(syncHeaderFooter);
        collab.ready.then(syncHeaderFooter).catch(() => {});
        return () => meta.unobserve(syncHeaderFooter);
    }, [editor, collab]);

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

    // Right-click context menu
    useEffect(() => {
        if (!editor) return;
        const dom = editor.view.dom as HTMLElement;
        const handler = (e: MouseEvent) => {
            if (e.shiftKey) return;
            e.preventDefault();
            e.stopPropagation();
            const view = editor.view;
            const coords = view.posAtCoords({ left: e.clientX, top: e.clientY });
            const clickPos = coords ? coords.pos : view.state.selection.from;
            const sel = editor.state.selection;
            const insideSelection = !sel.empty && clickPos >= sel.from && clickPos <= sel.to;
            if (!insideSelection && coords) editor.commands.setTextSelection(clickPos);

            const items = buildContextItems(editor, userRef.current, collab.doc, clickPos, {
                onCreateComment,
                onActiveCommentChange,
            });
            setContextMenu({ x: e.clientX, y: e.clientY, items });
        };
        dom.addEventListener('contextmenu', handler);
        return () => dom.removeEventListener('contextmenu', handler);
    }, [editor, collab.doc, onCreateComment, onActiveCommentChange]);

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

    const applyHeaderFooter = (
        kind: HeaderFooterKind.Header | HeaderFooterKind.Footer,
        left: string,
        right: string,
    ) => {
        if (!editor) return;
        const meta = collab.doc.getMap<string>('meta');
        if (kind === HeaderFooterKind.Header) {
            meta.set('headerLeft', left);
            meta.set('headerRight', right);
            paginationCmds(editor).updateHeaderContent(left, right);
        } else {
            meta.set('footerLeft', left);
            meta.set('footerRight', right);
            paginationCmds(editor).updateFooterContent(left, right);
        }
        setHeaderFooterFocus({ kind: 'none' });
    };

    const blockMenuItems: ContextMenuItem[] = blockMenu
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
                />
            )}
            {editor && headerFooterFocus.kind !== 'none' && (
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
                    onDismiss={() => setHeaderFooterFocus({ kind: 'none' })}
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

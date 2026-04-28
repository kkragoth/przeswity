# Tiptap Pagination Plus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom DOM-measurement pagination system with `tiptap-pagination-plus`, upgrade Tiptap to v3, add a click-to-edit header/footer bar, and ensure DOCX export matches editor page layout exactly.

**Architecture:** `PaginationPlus` extension handles page rendering for A4 (794×1123px, 96px margins). Header/footer content lives in the Yjs `meta` map (collaborative) and is applied to the extension on mount and on each remote change. The `HeaderFooterBar` floating component opens on header/footer click, edits left/right fields, and persists on blur.

**Tech Stack:** Tiptap v3 (`^3.22.5`), `tiptap-pagination-plus@^3.1.0`, `docx@^9.0.3`, Yjs, React

---

## File Map

| File | Action |
|------|--------|
| `frontend/package.json` | Upgrade all `@tiptap/*` to `^3.22.5`, add `tiptap-pagination-plus` |
| `frontend/src/editor/editor/extensions.ts` | Add `PaginationPlus`, extend `ExtensionsConfig` with callback getters |
| `frontend/src/editor/editor/EditorView.tsx` | Remove custom pagination, add `HeaderFooterFocus` state + Yjs sync |
| `frontend/src/editor/editor/HeaderFooterBar.tsx` | **New** — floating edit bar |
| `frontend/src/editor/editor/header-footer-bar.css` | **New** — bar styles |
| `frontend/src/editor/editor/useWordLikePagination.ts` | **Delete** |
| `frontend/src/editor/editor/pageLayout.ts` | **Delete** |
| `frontend/src/editor/editor/PageNumbers.tsx` | **Delete** |
| `frontend/src/editor/editor/page-numbers.css` | **Delete** |
| `frontend/src/editor/editor/editor.css` | Strip paper-sheet CSS, add `@media print`, clean `.prose-editor` |
| `frontend/src/editor/io/docx.ts` | A4 page size + margins + header/footer with page-number fields |
| `frontend/src/editor/io/ExportMenu.tsx` | Pass header/footer from editor storage to `editorToDocxBlob` |

---

## Task 1: Upgrade Tiptap packages + install tiptap-pagination-plus

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Update package.json dependencies**

In `frontend/package.json`, replace the entire `@tiptap/*` block under `dependencies` with:

```json
"@tiptap/core": "^3.22.5",
"@tiptap/extension-character-count": "^3.22.5",
"@tiptap/extension-collaboration": "^3.22.5",
"@tiptap/extension-collaboration-cursor": "^3.22.5",
"@tiptap/extension-image": "^3.22.5",
"@tiptap/extension-link": "^3.22.5",
"@tiptap/extension-placeholder": "^3.22.5",
"@tiptap/extension-table": "^3.22.5",
"@tiptap/extension-table-cell": "^3.22.5",
"@tiptap/extension-table-header": "^3.22.5",
"@tiptap/extension-table-row": "^3.22.5",
"@tiptap/extension-task-item": "^3.22.5",
"@tiptap/extension-task-list": "^3.22.5",
"@tiptap/extension-text-align": "^3.22.5",
"@tiptap/extension-underline": "^3.22.5",
"@tiptap/pm": "^3.22.5",
"@tiptap/react": "^3.22.5",
"@tiptap/starter-kit": "^3.22.5",
"tiptap-pagination-plus": "^3.1.0",
```

Remove `"@tiptap/extension-highlight": "^2.10.3"` — it was renamed; in v3 use `@tiptap/extension-highlight` if still needed, but the custom `Highlight.ts` extension overrides it anyway, so remove the package dep.

- [ ] **Step 2: Install**

```bash
cd frontend && npm install
```

Expected: no peer-dep errors. If there are peer-dep warnings about `@tiptap/core` version, they can be ignored as long as Tiptap packages are self-consistent.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: upgrade tiptap to v3, add tiptap-pagination-plus"
```

---

## Task 2: Update extensions.ts — integrate PaginationPlus

**Files:**
- Modify: `frontend/src/editor/editor/extensions.ts`

- [ ] **Step 1: Rewrite extensions.ts**

Replace the entire contents of `frontend/src/editor/editor/extensions.ts`:

```ts
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import CharacterCount from '@tiptap/extension-character-count';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { PaginationPlus } from 'tiptap-pagination-plus';
import type { HeaderClickEvent, FooterClickEvent } from 'tiptap-pagination-plus';

import { Comment } from '../comments/Comment';
import { Insertion, Deletion } from '../suggestions/TrackChange';
import { SuggestionMode } from '../suggestions/SuggestionMode';
import { SmartPaste } from './formatting/SmartPaste';
import { SmartTypography } from './formatting/SmartTypography';
import { Highlight } from './formatting/Highlight';
import { FindReplace } from './find/FindReplace';
import { Footnote } from './blocks/Footnote';
import { TableOfContents } from './blocks/Toc';
import { SlashCommand } from './slash/SlashCommand';
import type { SlashTriggerInfo } from './slash/SlashCommand';
import { GlossaryHighlight } from '../glossary/GlossaryHighlight';
import type { GlossaryEntry } from '../glossary/GlossaryHighlight';
import type { CollabBundle } from '../collab/yDoc';
import type { User } from '../identity/types';

// A4 at 96dpi: 794×1123px with 1-inch (96px) margins on all sides.
// Content width = 794 - 96 - 96 = 602px (matches --editor-measure token).
const A4_PAGE = {
    pageHeight: 1123,
    pageWidth: 794,
    marginTop: 96,
    marginBottom: 96,
    marginLeft: 96,
    marginRight: 96,
} as const;

export interface ExtensionsConfig {
    collab: CollabBundle
    user: User
    onCommentClick: (id: string) => void
    onSlashTrigger: (info: SlashTriggerInfo) => void
    getSuggestingEnabled: () => boolean
    getSuggestionAuthor: () => { id: string; name: string; color: string }
    getGlossaryEntries: () => GlossaryEntry[]
    getOnHeaderClick: () => HeaderClickEvent | undefined
    getOnFooterClick: () => FooterClickEvent | undefined
}

export function buildExtensions(config: ExtensionsConfig) {
    const { collab, user } = config;
    return [
        StarterKit.configure({ history: false }),
        Underline,
        Link.configure({ openOnClick: false }),
        CharacterCount,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Collaboration.configure({ document: collab.doc }),
        CollaborationCursor.configure({
            provider: collab.provider,
            user: { name: user.name, color: user.color },
        }),
        Comment.configure({ onCommentClick: config.onCommentClick }),
        Insertion,
        Deletion,
        SmartPaste,
        FindReplace,
        Footnote,
        Image.configure({ allowBase64: true, inline: false }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        SmartTypography,
        Highlight,
        TableOfContents,
        SlashCommand.configure({ onTrigger: config.onSlashTrigger }),
        GlossaryHighlight.configure({ getEntries: config.getGlossaryEntries }),
        SuggestionMode.configure({
            getEnabled: config.getSuggestingEnabled,
            getAuthor: config.getSuggestionAuthor,
        }),
        PaginationPlus.configure({
            ...A4_PAGE,
            pageGap: 32,
            contentMarginTop: 8,
            contentMarginBottom: 8,
            pageGapBorderColor: '#d4cfc9',
            pageBreakBackground: '#f0ede8',
            headerLeft: '',
            headerRight: '',
            footerLeft: '',
            footerRight: '{page}',
            onHeaderClick: (params) => config.getOnHeaderClick()?.(params),
            onFooterClick: (params) => config.getOnFooterClick()?.(params),
        }),
    ];
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd frontend && npm run typecheck
```

Expected: errors only related to files that still import removed types (`useWordLikePagination`, `pageLayout`, `PageNumbers`). Those will be fixed in later tasks. Fix any other errors now.

Common v3 API changes to watch for:
- If `useEditor` return type changed from `Editor | null` to `Editor | undefined`, update guards (`if (!editor)` handles both, `editor &&` handles both)
- If `CharacterCount` storage API changed, update `useReadingStats.ts`
- If `CollaborationCursor` `provider` option renamed, check its v3 docs

- [ ] **Step 3: Commit**

```bash
git add frontend/src/editor/editor/extensions.ts
git commit -m "feat: add PaginationPlus extension, upgrade extension config to v3"
```

---

## Task 3: Create HeaderFooterBar.tsx + CSS

**Files:**
- Create: `frontend/src/editor/editor/HeaderFooterBar.tsx`
- Create: `frontend/src/editor/editor/header-footer-bar.css`

- [ ] **Step 1: Create header-footer-bar.css**

Create `frontend/src/editor/editor/header-footer-bar.css`:

```css
.hf-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--bg-elev);
    border-bottom: 1px solid var(--border);
    z-index: var(--z-sticky);
    flex-shrink: 0;
}

.hf-bar__label {
    font-size: 11px;
    font-weight: var(--fw-semi);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-subtle);
    min-width: 48px;
    flex-shrink: 0;
}

.hf-bar__inputs {
    display: flex;
    gap: 8px;
    flex: 1;
    min-width: 0;
}

.hf-bar__field {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 0;
}

.hf-bar__field-label {
    font-size: 11px;
    color: var(--text-subtle);
    flex-shrink: 0;
}

.hf-bar__input {
    flex: 1;
    min-width: 0;
    height: 28px;
    padding: 0 8px;
    border: 1px solid var(--border);
    border-radius: var(--r-2);
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    font-family: var(--font-ui);
    outline: none;
    transition: border-color var(--d-fast) var(--ease-out);
}

.hf-bar__input:focus {
    border-color: var(--accent);
}

.hf-bar__hint {
    font-size: 11px;
    color: var(--text-subtle);
    white-space: nowrap;
    flex-shrink: 0;
}

.hf-bar__close {
    background: transparent;
    border: none;
    border-radius: var(--r-2);
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-muted);
    font-size: 14px;
    flex-shrink: 0;
    transition: background var(--d-fast) var(--ease-out), color var(--d-fast);
}

.hf-bar__close:hover {
    background: var(--bg-tint);
    color: var(--text);
}
```

- [ ] **Step 2: Create HeaderFooterBar.tsx**

Create `frontend/src/editor/editor/HeaderFooterBar.tsx`:

```tsx
import { useState, useEffect } from 'react';
import '@/editor/editor/header-footer-bar.css';

interface HeaderFooterBarProps {
    kind: 'header' | 'footer'
    left: string
    right: string
    onApply: (left: string, right: string) => void
    onDismiss: () => void
}

export function HeaderFooterBar({ kind, left, right, onApply, onDismiss }: HeaderFooterBarProps) {
    const [leftVal, setLeftVal] = useState(left);
    const [rightVal, setRightVal] = useState(right);

    useEffect(() => {
        setLeftVal(left);
        setRightVal(right);
    }, [left, right, kind]);

    const apply = () => onApply(leftVal, rightVal);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') apply();
        if (e.key === 'Escape') onDismiss();
    };

    return (
        <div className="hf-bar">
            <span className="hf-bar__label">{kind === 'header' ? 'Header' : 'Footer'}</span>
            <div className="hf-bar__inputs">
                <div className="hf-bar__field">
                    <span className="hf-bar__field-label">Left</span>
                    <input
                        className="hf-bar__input"
                        value={leftVal}
                        onChange={(e) => setLeftVal(e.target.value)}
                        onBlur={apply}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g. Chapter title"
                    />
                </div>
                <div className="hf-bar__field">
                    <span className="hf-bar__field-label">Right</span>
                    <input
                        className="hf-bar__input"
                        value={rightVal}
                        onChange={(e) => setRightVal(e.target.value)}
                        onBlur={apply}
                        onKeyDown={handleKeyDown}
                        placeholder="{page} of {total}"
                    />
                </div>
            </div>
            <span className="hf-bar__hint">tokens: {'{page}'} {'{total}'}</span>
            <button type="button" className="hf-bar__close" onClick={onDismiss} aria-label="Close">✕</button>
        </div>
    );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/editor/editor/HeaderFooterBar.tsx frontend/src/editor/editor/header-footer-bar.css
git commit -m "feat: add HeaderFooterBar component for editing page headers/footers"
```

---

## Task 4: Update EditorView.tsx

**Files:**
- Modify: `frontend/src/editor/editor/EditorView.tsx`

The goal is to:
1. Remove all custom pagination imports and code (`useWordLikePagination`, `pageCssVars`, `pageStackStyle`, `pageRef`, `pageStackHeight`, `pageTop`, paper-sheet rendering, `PageNumbers`)
2. Add `HeaderFooterFocus` ADT and `headerFooterFocus` state
3. Add callback refs for header/footer click handlers
4. Add Yjs observer to sync header/footer into the extension
5. Add `applyHeaderFooter` function (writes to Yjs + updates extension)
6. Render `HeaderFooterBar` when active

- [ ] **Step 1: Replace EditorView.tsx**

Replace the entire contents of `frontend/src/editor/editor/EditorView.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';

import { Toolbar } from './Toolbar';
import { BubbleToolbar } from './BubbleToolbar';
import { HeaderFooterBar } from './HeaderFooterBar';
import { ContextMenu } from '../shell/ContextMenu';
import type { ContextMenuItem } from '../shell/ContextMenu';
import { CommentAnchors } from '../comments/CommentAnchors';
import { DragHandle } from './blocks/DragHandle';
import { moveBlock, duplicateBlock, deleteBlock } from './blocks/blockOps';
import { SlashMenu } from './slash/SlashMenu';
import type { SlashTriggerInfo } from './slash/SlashCommand';
import type { GlossaryEntry } from '../glossary/GlossaryHighlight';

import { buildExtensions } from './extensions';
import { buildContextItems } from './contextItems';
import { useBlockHover } from './useBlockHover';
import { useBlockDragOver, INITIAL_DRAG_STATE, type DragState } from './useBlockDragDrop';
import { useCommentScrollPulse } from './useCommentScrollPulse';

import type { CollabBundle } from '../collab/yDoc';
import type { User } from '../identity/types';
import { ROLE_PERMISSIONS } from '../identity/types';

type HeaderFooterFocus =
    | { kind: 'header'; left: string; right: string }
    | { kind: 'footer'; left: string; right: string }
    | { kind: 'none' };

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

    // Live refs for header/footer click callbacks — avoids recreating the editor
    const onHeaderClickRef = useRef<(() => void) | undefined>(undefined);
    const onFooterClickRef = useRef<(() => void) | undefined>(undefined);
    onHeaderClickRef.current = () => {
        const meta = collab.doc.getMap<string>('meta');
        setHeaderFooterFocus({
            kind: 'header',
            left: meta.get('headerLeft') ?? '',
            right: meta.get('headerRight') ?? '',
        });
    };
    onFooterClickRef.current = () => {
        const meta = collab.doc.getMap<string>('meta');
        setHeaderFooterFocus({
            kind: 'footer',
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
                getOnHeaderClick: () => onHeaderClickRef.current
                    ? ({ event: _e, pageNumber: _p }) => onHeaderClickRef.current?.()
                    : undefined,
                getOnFooterClick: () => onFooterClickRef.current
                    ? ({ event: _e, pageNumber: _p }) => onFooterClickRef.current?.()
                    : undefined,
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

    // Sync header/footer from Yjs meta map into PaginationPlus extension
    useEffect(() => {
        if (!editor) return;
        const meta = collab.doc.getMap<string>('meta');

        const syncHeaderFooter = () => {
            editor.commands.updateHeaderContent(
                meta.get('headerLeft') ?? '',
                meta.get('headerRight') ?? '',
            );
            editor.commands.updateFooterContent(
                meta.get('footerLeft') ?? '',
                meta.get('footerRight') ?? '{page}',
            );
        };

        meta.observe(syncHeaderFooter);
        collab.ready.then(syncHeaderFooter).catch(() => {});

        return () => meta.unobserve(syncHeaderFooter);
    }, [editor, collab]);

    const applyHeaderFooter = (kind: 'header' | 'footer', left: string, right: string) => {
        if (!editor) return;
        const meta = collab.doc.getMap<string>('meta');
        if (kind === 'header') {
            meta.set('headerLeft', left);
            meta.set('headerRight', right);
            editor.commands.updateHeaderContent(left, right);
        } else {
            meta.set('footerLeft', left);
            meta.set('footerRight', right);
            editor.commands.updateFooterContent(left, right);
        }
        setHeaderFooterFocus({ kind: 'none' });
    };

    useEffect(() => {
        if (editor) editor.setEditable(canEditOrSuggest);
    }, [editor, canEditOrSuggest]);

    useEffect(() => {
        if (editor) onEditorReady(editor);
    }, [editor, onEditorReady]);

    useEffect(() => {
        if (!editor) return;
        collab.provider.awareness?.setLocalStateField('user', {
            name: user.name,
            color: user.color,
        });
    }, [collab.provider, editor, user.name, user.color]);

    const hoveredBlock = useBlockHover(editor);
    useBlockDragOver(editor, dragStateRef, setDropTop);

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

    const blockMenuItems: ContextMenuItem[] = blockMenu
        ? [
            {
                label: 'Move up',
                icon: '↑',
                shortcut: '⌥⇧↑',
                action: () => moveBlock(editor!, blockMenu.pos, 'up'),
            },
            {
                label: 'Move down',
                icon: '↓',
                shortcut: '⌥⇧↓',
                action: () => moveBlock(editor!, blockMenu.pos, 'down'),
            },
            { label: '', separator: true },
            {
                label: 'Duplicate',
                icon: '⎘',
                shortcut: '⌘D',
                action: () => duplicateBlock(editor!, blockMenu.pos),
            },
            { label: '', separator: true },
            {
                label: 'Delete block',
                icon: '🗑',
                danger: true,
                action: () => deleteBlock(editor!, blockMenu.pos),
            },
        ]
        : [];

    const focusOnEmptyClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!editor || !canEditOrSuggest) return;
        const target = e.target as HTMLElement;
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
                    onApply={(left, right) => applyHeaderFooter(headerFooterFocus.kind as 'header' | 'footer', left, right)}
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
```

- [ ] **Step 2: Run typecheck**

```bash
cd frontend && npm run typecheck
```

Expected: errors about deleted files (`useWordLikePagination`, `pageLayout`, `PageNumbers`) — those will be fixed in Task 5 when those files are deleted and their import sites cleaned. Fix any other errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/editor/editor/EditorView.tsx
git commit -m "feat: replace custom pagination with PaginationPlus in EditorView"
```

---

## Task 5: Delete old pagination files

**Files:**
- Delete: `frontend/src/editor/editor/useWordLikePagination.ts`
- Delete: `frontend/src/editor/editor/pageLayout.ts`
- Delete: `frontend/src/editor/editor/PageNumbers.tsx`
- Delete: `frontend/src/editor/editor/page-numbers.css`

- [ ] **Step 1: Delete files**

```bash
rm frontend/src/editor/editor/useWordLikePagination.ts
rm frontend/src/editor/editor/pageLayout.ts
rm frontend/src/editor/editor/PageNumbers.tsx
rm frontend/src/editor/editor/page-numbers.css
```

- [ ] **Step 2: Run typecheck to confirm clean**

```bash
cd frontend && npm run typecheck
```

Expected: 0 errors related to the deleted files. Any remaining errors must be fixed before proceeding.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete custom pagination files (replaced by PaginationPlus)"
```

---

## Task 6: Update editor.css

**Files:**
- Modify: `frontend/src/editor/editor/editor.css`

The paper-sheet and pagination CSS must be removed. `.prose-editor` no longer controls its own width/height/margin (the plugin does). Add `@media print` for print-ready output.

- [ ] **Step 1: Replace editor.css**

Replace the entire contents of `frontend/src/editor/editor/editor.css`:

```css
/* ---------- Editor shell ---------- */
.editor-shell {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--bg);
    transition: box-shadow var(--d-mid) var(--ease-out);
}

.editor-shell.is-suggesting {
    box-shadow:
        inset 0 0 0 2px var(--accent),
        inset 0 0 24px var(--accent-soft);
}

/* ---------- Scroll container ---------- */
.editor-scroll {
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
    padding: var(--sp-12) var(--sp-6) var(--sp-16);
    background: var(--bg);
}

/* ---------- Page wrapper ----------
   PaginationPlus owns width, height and margins via [data-rm-pagination].
   .editor-page just centers the plugin container.
*/
.editor-page {
    position: relative;
    margin: 0 auto;
    max-width: 100%;
}

/* ---------- Content typography ----------
   PaginationPlus controls .prose-editor sizing — no width/height/margin overrides here.
*/
.prose-editor {
    position: relative;
    z-index: 1;
    outline: none;
    font-family: var(--font-body);
    font-size: var(--content-fs);
    line-height: var(--content-lh);
    color: var(--text);
    font-feature-settings: 'kern', 'liga', 'onum', 'pnum';
}

.prose-editor > * {
    margin-top: 0;
}

.prose-editor p {
    margin: 0;
    padding-bottom: 0.85em;
}

.prose-editor h1 {
    font-family: var(--font-body);
    font-size: 30px;
    font-weight: var(--fw-semi);
    line-height: 1.2;
    margin: 0;
    padding-top: 1.4em;
    padding-bottom: 0.5em;
    color: var(--text);
}

.prose-editor h2 {
    font-family: var(--font-body);
    font-size: 22px;
    font-weight: var(--fw-semi);
    line-height: 1.3;
    margin: 0;
    padding-top: 1.25em;
    padding-bottom: 0.45em;
    color: var(--text);
}

.prose-editor h3 {
    font-family: var(--font-body);
    font-size: 18px;
    font-weight: var(--fw-semi);
    line-height: 1.35;
    margin: 0;
    padding-top: 1.1em;
    padding-bottom: 0.4em;
    color: var(--text);
}

.prose-editor blockquote {
    position: relative;
    font-style: italic;
    margin: 0;
    padding: 0.55em 0 1.25em 28px;
    color: var(--text-muted);
}

.prose-editor blockquote::before {
    content: '\201C';
    font-size: 64px;
    color: var(--accent);
    position: absolute;
    left: -28px;
    top: 0;
    line-height: 1;
    opacity: 0.4;
    font-style: normal;
}

.prose-editor ul,
.prose-editor ol {
    padding-left: 24px;
    margin: 0;
    padding-bottom: 0.85em;
}

.prose-editor li::marker {
    color: var(--text-muted);
}

.prose-editor pre {
    background: #16110d;
    color: var(--text-on-accent);
    padding: var(--sp-3) var(--sp-4);
    border-radius: var(--r-2);
    overflow-x: auto;
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.6;
    margin: 0;
    margin-bottom: 0.85em;
}

.prose-editor code {
    font-family: var(--font-mono);
    font-size: 0.92em;
    background: var(--bg-tint);
    padding: 1px 5px;
    border-radius: var(--r-2);
}

.prose-editor pre code {
    background: transparent;
    padding: 0;
    font-size: inherit;
    border-radius: 0;
}

.prose-editor a {
    color: var(--accent);
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
}

.prose-editor [data-placeholder]:before {
    content: attr(data-placeholder);
    color: var(--text-subtle);
    pointer-events: none;
    float: left;
    height: 0;
}

.prose-editor ul[data-type='taskList'] {
    list-style: none;
    padding-left: 0;
}

.prose-editor ul[data-type='taskList'] li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
}

.prose-editor ul[data-type='taskList'] li > label {
    margin-top: 4px;
}

/* ---------- Bubble menu ---------- */
.bubble-menu {
    display: flex;
    gap: 2px;
    background: var(--text);
    border-radius: var(--r-2);
    padding: 4px;
    box-shadow: var(--shadow-paper-2);
}

.bubble-menu button {
    background: transparent;
    border: none;
    color: var(--text-on-accent);
    padding: 4px 8px;
    border-radius: var(--r-2);
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
}

.bubble-menu button:hover {
    background: rgba(255, 255, 255, 0.10);
}

.bubble-menu button.is-active {
    background: rgba(255, 255, 255, 0.20);
}

/* ---------- Print ---------- */
@media print {
    .editor-toolbar,
    .toolbar,
    .left-pane,
    .right-pane,
    .statusbar,
    .bubble-menu,
    .drag-handle,
    .hf-bar { display: none !important; }

    .editor-scroll {
        overflow: visible;
        padding: 0;
    }

    .editor-page {
        margin: 0;
        width: 100%;
    }
}
```

- [ ] **Step 2: Run typecheck + build**

```bash
cd frontend && npm run typecheck && npm run build
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/editor/editor/editor.css
git commit -m "style: replace paper-sheet CSS with PaginationPlus-compatible styles, add print media query"
```

---

## Task 7: Update docx.ts for A4 + header/footer parity

**Files:**
- Modify: `frontend/src/editor/io/docx.ts`

DOCX must match the editor exactly: A4 page, 1-inch margins, same header/footer content (with `{page}` → Word `PAGE` field, `{total}` → Word `NUMPAGES` field).

Conversion: 1 inch = 1440 twips. 96px = 1 inch.
- A4 width: 11906 twips (210mm)
- A4 height: 16838 twips (297mm)
- Margin: 1440 twips (1 inch)
- Content width (for right tab stop): 11906 − 1440 − 1440 = 9026 twips

- [ ] **Step 1: Replace docx.ts**

Replace the entire contents of `frontend/src/editor/io/docx.ts`:

```ts
import {
    Document,
    Header,
    Footer,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    ExternalHyperlink,
    PageNumber,
    TabStopType,
} from 'docx';
import type { Editor } from '@tiptap/react';

// A4 dimensions in twips (1 inch = 1440 twips at 20 twips/pt, 72pt/in)
const A4_WIDTH_TWIPS = 11906;
const A4_HEIGHT_TWIPS = 16838;
const MARGIN_TWIPS = 1440; // 1 inch = 96px at 96dpi
// Right tab stop at content right edge
const CONTENT_WIDTH_TWIPS = A4_WIDTH_TWIPS - MARGIN_TWIPS * 2; // 9026

interface JSONNode {
    type: string
    attrs?: Record<string, unknown>
    content?: JSONNode[]
    marks?: { type: string; attrs?: Record<string, unknown> }[]
    text?: string
}

export interface ExportOptions {
    acceptSuggestions: boolean
    headerLeft?: string
    headerRight?: string
    footerLeft?: string
    footerRight?: string
}

function alignment(attrs: JSONNode['attrs']): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
    const a = attrs?.textAlign as string | undefined;
    if (a === 'center') return AlignmentType.CENTER;
    if (a === 'right') return AlignmentType.RIGHT;
    if (a === 'justify') return AlignmentType.JUSTIFIED;
    return undefined;
}

function inlinesToRuns(
    nodes: JSONNode[] | undefined,
    opts: ExportOptions,
): (TextRun | ExternalHyperlink)[] {
    if (!nodes) return [];
    const runs: (TextRun | ExternalHyperlink)[] = [];
    for (const n of nodes) {
        if (n.type !== 'text') continue;
        const marks = n.marks ?? [];
        const isDeletion = marks.some((m) => m.type === 'deletion');
        const isInsertion = marks.some((m) => m.type === 'insertion');
        if (opts.acceptSuggestions && isDeletion) continue;
        const run = new TextRun({
            text: n.text ?? '',
            bold: marks.some((m) => m.type === 'bold'),
            italics: marks.some((m) => m.type === 'italic'),
            underline: marks.some((m) => m.type === 'underline') ? {} : undefined,
            strike: marks.some((m) => m.type === 'strike') && !opts.acceptSuggestions ? true : undefined,
            color: !opts.acceptSuggestions
                ? isDeletion
                    ? '9CA3AF'
                    : isInsertion
                        ? '15803D'
                        : undefined
                : undefined,
        });
        const link = marks.find((m) => m.type === 'link');
        if (link) {
            runs.push(
                new ExternalHyperlink({
                    link: (link.attrs?.href as string) ?? '#',
                    children: [run],
                }),
            );
        } else {
            runs.push(run);
        }
    }
    return runs;
}

function blockToParagraphs(node: JSONNode, opts: ExportOptions): Paragraph[] {
    switch (node.type) {
        case 'paragraph':
            return [
                new Paragraph({
                    alignment: alignment(node.attrs),
                    children: inlinesToRuns(node.content, opts),
                }),
            ];
        case 'heading': {
            const level = (node.attrs?.level as number) ?? 1;
            const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
                1: HeadingLevel.HEADING_1,
                2: HeadingLevel.HEADING_2,
                3: HeadingLevel.HEADING_3,
                4: HeadingLevel.HEADING_4,
                5: HeadingLevel.HEADING_5,
                6: HeadingLevel.HEADING_6,
            };
            return [
                new Paragraph({
                    heading: headingMap[level] ?? HeadingLevel.HEADING_1,
                    alignment: alignment(node.attrs),
                    children: inlinesToRuns(node.content, opts),
                }),
            ];
        }
        case 'blockquote': {
            return (node.content ?? []).map(
                (c) =>
                    new Paragraph({
                        style: 'IntenseQuote',
                        children: inlinesToRuns(c.content, opts),
                    }),
            );
        }
        case 'bulletList':
            return (node.content ?? []).flatMap((li) =>
                (li.content ?? []).map(
                    (c) =>
                        new Paragraph({
                            bullet: { level: 0 },
                            children: inlinesToRuns(c.content, opts),
                        }),
                ),
            );
        case 'orderedList':
            return (node.content ?? []).flatMap((li, i) =>
                (li.content ?? []).map(
                    (c) =>
                        new Paragraph({
                            numbering: { reference: 'numbered', level: 0 },
                            children: [
                                new TextRun({ text: `${i + 1}. ` }),
                                ...inlinesToRuns(c.content, opts),
                            ],
                        }),
                ),
            );
        case 'taskList':
            return (node.content ?? []).flatMap((li) => {
                const checked = li.attrs?.checked ? '☑' : '☐';
                return (li.content ?? []).map(
                    (c) =>
                        new Paragraph({
                            children: [
                                new TextRun({ text: `${checked} ` }),
                                ...inlinesToRuns(c.content, opts),
                            ],
                        }),
                );
            });
        case 'codeBlock':
            return [
                new Paragraph({
                    style: 'Code',
                    children: [new TextRun({ text: node.content?.[0]?.text ?? '', font: 'Courier New' })],
                }),
            ];
        case 'horizontalRule':
            return [
                new Paragraph({
                    border: { bottom: { color: '999999', style: 'single', size: 6, space: 1 } },
                    children: [],
                }),
            ];
        default:
            return [
                new Paragraph({
                    children: inlinesToRuns(node.content, opts),
                }),
            ];
    }
}

// Converts a header/footer string with {page}/{total} tokens into TextRun children.
// Strips HTML tags. Splits on tokens and replaces with DOCX page-number fields.
function parseHfTokens(text: string): (TextRun)[] {
    const plain = text.replace(/<[^>]+>/g, '').trim();
    if (!plain) return [];

    const parts = plain.split(/(\{page\}|\{total\})/);
    return parts.flatMap((part): TextRun[] => {
        if (part === '{page}') return [new TextRun({ children: [PageNumber.CURRENT] })];
        if (part === '{total}') return [new TextRun({ children: [PageNumber.TOTAL_PAGES] })];
        return part ? [new TextRun({ text: part })] : [];
    });
}

// Builds a header or footer paragraph with left and right content separated by a right-aligned tab.
function buildHfParagraph(left: string, right: string): Paragraph {
    const leftRuns = parseHfTokens(left);
    const rightRuns = parseHfTokens(right);

    const children: (TextRun)[] = [
        ...leftRuns,
        ...(rightRuns.length > 0 ? [new TextRun({ text: '\t' }), ...rightRuns] : []),
    ];

    return new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH_TWIPS }],
        children,
    });
}

export async function editorToDocxBlob(
    editor: Editor,
    opts: ExportOptions = { acceptSuggestions: true },
): Promise<Blob> {
    const json = editor.getJSON() as JSONNode;
    const paragraphs: Paragraph[] = (json.content ?? []).flatMap((b) => blockToParagraphs(b, opts));

    const headerLeft = opts.headerLeft ?? '';
    const headerRight = opts.headerRight ?? '';
    const footerLeft = opts.footerLeft ?? '';
    const footerRight = opts.footerRight ?? '';

    const hasHeader = headerLeft || headerRight;
    const hasFooter = footerLeft || footerRight;

    const doc = new Document({
        sections: [
            {
                properties: {
                    page: {
                        size: {
                            width: A4_WIDTH_TWIPS,
                            height: A4_HEIGHT_TWIPS,
                        },
                        margin: {
                            top: MARGIN_TWIPS,
                            bottom: MARGIN_TWIPS,
                            left: MARGIN_TWIPS,
                            right: MARGIN_TWIPS,
                        },
                    },
                },
                headers: hasHeader
                    ? { default: new Header({ children: [buildHfParagraph(headerLeft, headerRight)] }) }
                    : undefined,
                footers: hasFooter
                    ? { default: new Footer({ children: [buildHfParagraph(footerLeft, footerRight)] }) }
                    : undefined,
                children: paragraphs,
            },
        ],
    });
    return Packer.toBlob(doc);
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd frontend && npm run typecheck
```

Fix any type errors (e.g. if `TabStopType` is not exported from `docx` v9, replace with `'right' as const`; if `PageNumber` import path differs, check docx v9 exports).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/editor/io/docx.ts
git commit -m "feat: docx export — A4 page size, margins, header/footer with page number fields"
```

---

## Task 8: Update ExportMenu.tsx

**Files:**
- Modify: `frontend/src/editor/io/ExportMenu.tsx`

Pass header/footer content from the editor's PaginationPlus storage into `editorToDocxBlob`.

- [ ] **Step 1: Update ExportMenu.tsx**

Replace the contents of `frontend/src/editor/io/ExportMenu.tsx`:

```tsx
import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { saveAs } from 'file-saver';
import { editorToMarkdown } from './markdown';
import { editorToDocxBlob } from './docx';
import type { ExportOptions } from './docx';

interface ExportMenuProps {
    editor: Editor | null
}

function readPaginationOpts(editor: Editor): Pick<ExportOptions, 'headerLeft' | 'headerRight' | 'footerLeft' | 'footerRight'> {
    // PaginationPlus stores current header/footer in editor.storage
    const s = editor.storage['PaginationPlus'] as {
        headerLeft?: string; headerRight?: string;
        footerLeft?: string; footerRight?: string;
    } | undefined;
    return {
        headerLeft: s?.headerLeft ?? '',
        headerRight: s?.headerRight ?? '',
        footerLeft: s?.footerLeft ?? '',
        footerRight: s?.footerRight ?? '',
    };
}

export function ExportMenu({ editor }: ExportMenuProps) {
    const [open, setOpen] = useState(false);

    if (!editor) return null;

    const downloadMarkdown = () => {
        const md = editorToMarkdown(editor);
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        saveAs(blob, 'document.md');
        setOpen(false);
    };

    const downloadDocxClean = async () => {
        const blob = await editorToDocxBlob(editor, {
            acceptSuggestions: true,
            ...readPaginationOpts(editor),
        });
        saveAs(blob, 'document-clean.docx');
        setOpen(false);
    };

    const downloadDocxWithTracks = async () => {
        const blob = await editorToDocxBlob(editor, {
            acceptSuggestions: false,
            ...readPaginationOpts(editor),
        });
        saveAs(blob, 'document-with-tracks.docx');
        setOpen(false);
    };

    return (
        <div className="export-menu">
            <button type="button" className="tb-btn" onClick={() => setOpen((v) => !v)}>
                Export ▾
            </button>
            {open && (
                <div className="export-dropdown" onMouseLeave={() => setOpen(false)}>
                    <button type="button" onClick={downloadMarkdown}>
                        Markdown (.md)
                    </button>
                    <button type="button" onClick={downloadDocxClean}>
                        DOCX — clean (suggestions accepted)
                    </button>
                    <button type="button" onClick={downloadDocxWithTracks}>
                        DOCX — with track-change colors
                    </button>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Run typecheck + build**

```bash
cd frontend && npm run typecheck && npm run build
```

Expected: clean build with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/editor/io/ExportMenu.tsx
git commit -m "feat: pass header/footer from PaginationPlus storage into DOCX export"
```

---

## Task 9: Final verification

- [ ] **Step 1: Full build check**

```bash
cd frontend && npm run build
```

Expected: success, no type errors.

- [ ] **Step 2: Dev server smoke test**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000`, open a book, verify:
- [ ] Pages render (A4 white sheets visible in editor)
- [ ] Clicking a page header opens the `HeaderFooterBar` at the top of the editor
- [ ] Clicking a page footer opens the `HeaderFooterBar` at the top of the editor
- [ ] Editing left/right inputs and blurring updates the header/footer on all pages
- [ ] `{page}` token renders the current page number in each page's header/footer
- [ ] Content breaks correctly across pages (no text cut off mid-page)

- [ ] **Step 3: DOCX export check**

In the editor, set a header (e.g. left: `My Document`, right: `{page}`). Export as DOCX clean. Open in Word or LibreOffice:
- [ ] Page size is A4
- [ ] Margins are 1 inch on all sides
- [ ] Header shows "My Document" left-aligned and page number right-aligned
- [ ] Footer matches editor footer

- [ ] **Step 4: Commit (if any final fixes)**

```bash
git add -A
git commit -m "chore: post-migration cleanup and verification"
```

import type { User } from '@/editor/identity/types';
import type { GlossaryEntry } from '@/editor/glossary/GlossaryHighlight';

/**
 * Ref-cell holding "ambient" editor context (current user, suggesting mode,
 * glossary entries, header/footer click handlers).
 *
 * WHY THIS EXISTS — the values inside MUST be readable synchronously from
 * code paths that run BEFORE React commits, e.g. ProseMirror plugin event
 * handlers, decorations, paste handlers, command callbacks, and DOM event
 * listeners attached to the editor view. A React subscription
 * (`useEditorLive`, `useEditorSession`) reads the value AFTER commit, which
 * is too late for those paths and would close over stale data.
 *
 * The single source of truth is updated in `EditorView.tsx` inside a
 * `useLayoutEffect` so the snapshot is current before any TipTap event
 * handler can fire on the new render.
 *
 * SYNCHRONOUS-READ CALLSITES (T-61 — keep in sync when adding new readers):
 * - `hooks/useEditorInit.ts` → passes `getSuggestingEnabled`,
 *   `getSuggestionAuthor`, `getGlossaryEntries`, `getOnHeaderClick`,
 *   `getOnFooterClick` into `buildExtensions`. These are invoked from
 *   ProseMirror plugin internals (suggestion plugin, glossary highlight
 *   decorations, header/footer click handlers) where a React hook cannot run.
 * - `hooks/useEditorContextMenu.ts` → `buildContextItems(..., ctx.get().user, ...)`
 *   inside a native `contextmenu` DOM event listener. The listener is bound
 *   once via `addEventListener`, so it must read the live user at fire-time.
 * - `hooks/useHeaderFooterSync.ts` → re-publishes fresh `onHeaderClick` /
 *   `onFooterClick` closures into ctx every render via `ctx.update({ ...ctx.get(), ... })`,
 *   so PM-driven header/footer focus events see the latest collab + state setters.
 *
 * If you add another callsite, append it here AND verify the data really
 * needs synchronous access (otherwise prefer a hook subscription).
 */
export interface EditorCtx {
    user: User;
    suggesting: boolean;
    glossary: GlossaryEntry[];
    onHeaderClick?: () => void;
    onFooterClick?: () => void;
}

export interface EditorContextHandle {
    update(next: EditorCtx): void;
    get(): EditorCtx;
}

export const createEditorContext = (initial: EditorCtx): EditorContextHandle => {
    let snap = initial;
    return {
        update(next) { snap = next; },
        get() { return snap; },
    };
};

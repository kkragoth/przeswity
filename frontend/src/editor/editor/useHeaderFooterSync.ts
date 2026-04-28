import { useState, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { Editor } from '@tiptap/react';
import type { CollabBundle } from '@/editor/collab/yDoc';
import { HeaderFooterKind } from '@/editor/editor/HeaderFooterBar';

export type HeaderFooterFocus =
    | { kind: HeaderFooterKind.Header; left: string; right: string }
    | { kind: HeaderFooterKind.Footer; left: string; right: string }
    | { kind: HeaderFooterKind.None };

// PaginationPlus augments Commands but the module augmentation may not propagate
// through all tsconfig paths — cast to access the added commands safely.
interface PaginationCommands {
    updateHeaderContent: (left: string, right: string) => void;
    updateFooterContent: (left: string, right: string) => void;
}

function paginationCmds(editor: Editor): PaginationCommands {
    return editor.commands as unknown as PaginationCommands;
}

interface UseHeaderFooterSyncOptions {
    collab: CollabBundle;
    editor: Editor | null;
    /** Stable refs owned by EditorView — captured by PaginationPlus on extension build */
    onHeaderClickRef: MutableRefObject<(() => void) | undefined>;
    onFooterClickRef: MutableRefObject<(() => void) | undefined>;
}

export function useHeaderFooterSync({ collab, editor, onHeaderClickRef, onFooterClickRef }: UseHeaderFooterSyncOptions) {
    const [headerFooterFocus, setHeaderFooterFocus] = useState<HeaderFooterFocus>({ kind: HeaderFooterKind.None });

    // Intentionally outside useEffect — PaginationPlus captures these refs once on extension
    // construction (via getOnHeaderClick/getOnFooterClick getters), so we must update .current
    // each render to avoid stale closures over collab/setHeaderFooterFocus.
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

    useEffect(() => {
        if (!editor) return;
        const meta = collab.doc.getMap<string>('meta');
        const syncHeaderFooter = () => {
            paginationCmds(editor).updateHeaderContent(
                meta.get('headerLeft') ?? '',
                meta.get('headerRight') ?? '',
            );
            paginationCmds(editor).updateFooterContent(
                meta.get('footerLeft') ?? '',
                meta.get('footerRight') ?? '{page}',
            );
        };
        let cancelled = false;
        const guardedSync = () => { if (!cancelled) syncHeaderFooter(); };
        meta.observe(syncHeaderFooter);
        collab.ready.then(guardedSync).catch(() => {});
        return () => { cancelled = true; meta.unobserve(syncHeaderFooter); };
    }, [editor, collab]);

    const applyHeaderFooter = (kind: HeaderFooterKind.Header | HeaderFooterKind.Footer, left: string, right: string) => {
        if (!editor) return;
        const meta = collab.doc.getMap<string>('meta');
        if (kind === HeaderFooterKind.Header) {
            meta.set('headerLeft', left);
            meta.set('headerRight', right);
            // Direct call ensures immediate local render; meta.observe will also fire
            paginationCmds(editor).updateHeaderContent(left, right);
        } else {
            meta.set('footerLeft', left);
            meta.set('footerRight', right);
            // Direct call ensures immediate local render; meta.observe will also fire
            paginationCmds(editor).updateFooterContent(left, right);
        }
        setHeaderFooterFocus({ kind: HeaderFooterKind.None });
    };

    return { headerFooterFocus, setHeaderFooterFocus, applyHeaderFooter };
}

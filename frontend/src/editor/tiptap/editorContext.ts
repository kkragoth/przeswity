import type { User } from '@/editor/identity/types';
import type { GlossaryEntry } from '@/editor/glossary/GlossaryHighlight';

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

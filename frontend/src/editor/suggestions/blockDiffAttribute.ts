import { Extension } from '@tiptap/core';

export const DIFF_BLOCK_TYPES = ['paragraph', 'heading', 'blockquote', 'listItem', 'taskItem'] as const;

/**
 * Adds a `diffBlock` global attribute to common block nodes. Used by the
 * version diff renderer to mark whole blocks as wholly-inserted / wholly-
 * deleted, so the read-only diff editor can paint a left-border ribbon on
 * them via `data-diff-block`. Renders to nothing when null, so it has no
 * effect outside diff view.
 */
export const DiffBlockAttr = Extension.create({
    name: 'diffBlockAttr',
    addGlobalAttributes() {
        return [
            {
                types: [...DIFF_BLOCK_TYPES],
                attributes: {
                    diffBlock: {
                        default: null,
                        parseHTML: (el) => el.getAttribute('data-diff-block'),
                        renderHTML: (attrs) => {
                            const v = (attrs as { diffBlock: string | null }).diffBlock;
                            return v ? { 'data-diff-block': v } : {};
                        },
                    },
                },
            },
        ];
    },
});

// @vitest-environment jsdom
/**
 * Feature 7 — SuggestionMode engine unit tests.
 * Uses a headless Tiptap editor (no DOM render).
 * Each test asserts the exact mark state after appendTransaction runs.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Insertion, Deletion, FormatChange } from '../trackChangeMarks';
import { SuggestionMode, type SuggestionAuthor } from '../SuggestionMode';
import { acceptSuggestion, rejectSuggestion, acceptFormatChange, rejectFormatChange } from '../suggestionOps';

const TEST_AUTHOR: SuggestionAuthor = { id: 'u1', name: 'Alice', color: '#c00' };

function createEditor() {
    return new Editor({
        extensions: [
            StarterKit,
            Insertion,
            Deletion,
            FormatChange,
            SuggestionMode.configure({
                getEnabled: () => true,
                getAuthor: () => TEST_AUTHOR,
            }),
        ],
        content: '<p>hello world</p>',
    });
}

function markNames(editor: Editor): string[] {
    const names = new Set<string>();
    editor.state.doc.descendants((node) => {
        for (const m of node.marks) names.add(m.type.name);
    });
    return [...names].sort();
}

function insertionCount(editor: Editor): number {
    let count = 0;
    const ids = new Set<string>();
    editor.state.doc.descendants((node) => {
        for (const m of node.marks) {
            if (m.type.name === 'insertion' && !ids.has(m.attrs.suggestionId as string)) {
                ids.add(m.attrs.suggestionId as string);
                count++;
            }
        }
    });
    return count;
}

function deletionCount(editor: Editor): number {
    let count = 0;
    const ids = new Set<string>();
    editor.state.doc.descendants((node) => {
        for (const m of node.marks) {
            if (m.type.name === 'deletion' && !ids.has(m.attrs.suggestionId as string)) {
                ids.add(m.attrs.suggestionId as string);
                count++;
            }
        }
    });
    return count;
}

function formatChangeCount(editor: Editor): number {
    const ids = new Set<string>();
    editor.state.doc.descendants((node) => {
        for (const m of node.marks) {
            if (m.type.name === 'formatChange') ids.add(m.attrs.suggestionId as string);
        }
    });
    return ids.size;
}

let editor: Editor;
beforeEach(() => { editor = createEditor(); });
afterEach(() => editor.destroy());

describe('SuggestionMode — ReplaceStep tracking', () => {
    it('typing at end → 1 insertion', () => {
        editor.chain().focus().setTextSelection(11).insertContent('!').run();
        expect(insertionCount(editor)).toBe(1);
        expect(deletionCount(editor)).toBe(0);
    });

    it('select-then-delete → 1 deletion', () => {
        // Select "hello" (pos 1-6) and delete
        editor.chain().focus().setTextSelection({ from: 1, to: 6 }).deleteSelection().run();
        expect(deletionCount(editor)).toBe(1);
        expect(insertionCount(editor)).toBe(0);
    });

    it('select-then-type (replace) → paired insertion + deletion with same suggestionId', () => {
        // Select "hello" and type "bye"
        editor.chain().focus().setTextSelection({ from: 1, to: 6 }).insertContent('bye').run();
        expect(insertionCount(editor)).toBe(1);
        expect(deletionCount(editor)).toBe(1);
        // Same suggestionId on both
        const ids = new Set<string>();
        editor.state.doc.descendants((node) => {
            for (const m of node.marks) {
                if (m.type.name === 'insertion' || m.type.name === 'deletion') {
                    ids.add(m.attrs.suggestionId as string);
                }
            }
        });
        expect(ids.size).toBe(1);
    });

    it('accept insert → text stays, no marks', () => {
        editor.chain().focus().setTextSelection(11).insertContent('!').run();
        const ids = new Set<string>();
        editor.state.doc.descendants((node) => {
            node.marks.filter((m) => m.type.name === 'insertion').forEach((m) => ids.add(m.attrs.suggestionId as string));
        });
        const [id] = ids;
        acceptSuggestion(editor, id);
        expect(markNames(editor).filter((n) => n === 'insertion' || n === 'deletion')).toHaveLength(0);
        expect(editor.state.doc.textContent).toContain('!');
    });

    it('reject insert → text removed, no marks', () => {
        editor.chain().focus().setTextSelection(11).insertContent('!').run();
        const ids = new Set<string>();
        editor.state.doc.descendants((node) => {
            node.marks.filter((m) => m.type.name === 'insertion').forEach((m) => ids.add(m.attrs.suggestionId as string));
        });
        const [id] = ids;
        rejectSuggestion(editor, id);
        expect(markNames(editor).filter((n) => n === 'insertion' || n === 'deletion')).toHaveLength(0);
        expect(editor.state.doc.textContent).not.toContain('!');
    });

    it('reject replace → original text restored, no marks', () => {
        editor.chain().focus().setTextSelection({ from: 1, to: 6 }).insertContent('bye').run();
        const ids = new Set<string>();
        editor.state.doc.descendants((node) => {
            node.marks.filter((m) => m.type.name === 'insertion').forEach((m) => ids.add(m.attrs.suggestionId as string));
        });
        const [id] = ids;
        rejectSuggestion(editor, id);
        expect(editor.state.doc.textContent).toContain('hello');
        expect(editor.state.doc.textContent).not.toContain('bye');
    });
});

describe('SuggestionMode — undo detection', () => {
    it('undo a typed insertion does NOT create a new deletion suggestion', () => {
        editor.chain().focus().setTextSelection(11).insertContent('!').run();
        expect(insertionCount(editor)).toBe(1);
        editor.commands.undo();
        // After undo: the insertion mark was reverted — no content changes tracked as new suggestions
        expect(deletionCount(editor)).toBe(0);
    });
});

describe('SuggestionMode — AddMarkStep tracking (bold toggle)', () => {
    it('bold on selection → 1 formatChange', () => {
        editor.chain().focus().setTextSelection({ from: 1, to: 6 }).setBold().run();
        expect(formatChangeCount(editor)).toBe(1);
    });

    it('accept formatChange → bold stays, no formatChange marks', () => {
        editor.chain().focus().setTextSelection({ from: 1, to: 6 }).setBold().run();
        const ids = new Set<string>();
        editor.state.doc.descendants((node) => {
            node.marks.filter((m) => m.type.name === 'formatChange').forEach((m) => ids.add(m.attrs.suggestionId as string));
        });
        const [id] = ids;
        acceptFormatChange(editor, id);
        expect(formatChangeCount(editor)).toBe(0);
        // Bold mark should remain
        let hasBold = false;
        editor.state.doc.descendants((node) => {
            if (node.marks.some((m) => m.type.name === 'bold')) hasBold = true;
        });
        expect(hasBold).toBe(true);
    });

    it('reject formatChange → bold removed', () => {
        editor.chain().focus().setTextSelection({ from: 1, to: 6 }).setBold().run();
        const ids = new Set<string>();
        editor.state.doc.descendants((node) => {
            node.marks.filter((m) => m.type.name === 'formatChange').forEach((m) => ids.add(m.attrs.suggestionId as string));
        });
        const [id] = ids;
        rejectFormatChange(editor, id);
        expect(formatChangeCount(editor)).toBe(0);
        let hasBold = false;
        editor.state.doc.descendants((node) => {
            if (node.marks.some((m) => m.type.name === 'bold')) hasBold = true;
        });
        expect(hasBold).toBe(false);
    });
});

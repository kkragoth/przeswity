import { Mark, mergeAttributes, getSchema } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

export const PROSEMIRROR_FIELD = 'default';

export const ALLOWED_FONTS = [
    'serif',
    'sans',
    'mono',
    'crimson',
    'lora',
    'sourceSerif',
    'inter',
    'ibmPlex',
] as const;

export type AllowedFont = typeof ALLOWED_FONTS[number];

export const FontFamily = Mark.create({
    name: 'fontFamily',
    addAttributes: () => ({
        font: {
            default: null as AllowedFont | null,
            parseHTML: (el: HTMLElement) => {
                const v = el.getAttribute('data-font');
                return v && (ALLOWED_FONTS as readonly string[]).includes(v) ? v : null;
            },
            renderHTML: (attrs: { font: AllowedFont | null }) =>
                attrs.font ? { 'data-font': attrs.font } : {},
        },
    }),
    parseHTML: () => [{ tag: 'span[data-font]' }],
    renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes), 0],
});

const Comment = Mark.create({
    name: 'comment',
    inclusive: false,
    addAttributes: () => ({
        commentId: {
            default: null as string | null,
            parseHTML: (el: HTMLElement) => el.getAttribute('data-comment-id'),
            renderHTML: (attrs: { commentId: string | null }) =>
                attrs.commentId ? { 'data-comment-id': attrs.commentId } : {},
        },
    }),
    parseHTML: () => [{ tag: 'span[data-comment-id]' }],
    renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes), 0],
});

const suggestionAttrs = () => ({
    suggestionId: {
        default: null as string | null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-suggestion-id'),
        renderHTML: (attrs: { suggestionId: string | null }) =>
            attrs.suggestionId ? { 'data-suggestion-id': attrs.suggestionId } : {},
    },
    authorId: {
        default: null as string | null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-author-id'),
        renderHTML: (attrs: { authorId: string | null }) =>
            attrs.authorId ? { 'data-author-id': attrs.authorId } : {},
    },
    authorName: {
        default: null as string | null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-author-name'),
        renderHTML: (attrs: { authorName: string | null }) =>
            attrs.authorName ? { 'data-author-name': attrs.authorName } : {},
    },
    authorColor: {
        default: null as string | null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-author-color'),
        renderHTML: (attrs: { authorColor: string | null }) =>
            attrs.authorColor ? { 'data-author-color': attrs.authorColor } : {},
    },
    timestamp: {
        default: null as string | null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-timestamp'),
        renderHTML: (attrs: { timestamp: string | null }) =>
            attrs.timestamp ? { 'data-timestamp': attrs.timestamp } : {},
    },
});

const Insertion = Mark.create({
    name: 'insertion',
    inclusive: false,
    addAttributes: suggestionAttrs,
    parseHTML: () => [{ tag: 'ins[data-suggestion-id]' }],
    renderHTML: ({ HTMLAttributes }) => ['ins', mergeAttributes(HTMLAttributes), 0],
});

const Deletion = Mark.create({
    name: 'deletion',
    inclusive: false,
    addAttributes: suggestionAttrs,
    parseHTML: () => [{ tag: 'del[data-suggestion-id]' }],
    renderHTML: ({ HTMLAttributes }) => ['del', mergeAttributes(HTMLAttributes), 0],
});

export function buildSchemaExtensions() {
    return [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Underline,
        Link.configure({ openOnClick: false }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Highlight.configure({ multicolor: false }),
        Image.configure({ allowBase64: true, inline: false }),
        Table.configure({ resizable: false }),
        TableRow,
        TableCell,
        TableHeader,
        TaskList,
        TaskItem.configure({ nested: true }),
        FontFamily,
        Comment,
        Insertion,
        Deletion,
    ];
}

export function buildProseMirrorSchema() {
    return getSchema(buildSchemaExtensions());
}

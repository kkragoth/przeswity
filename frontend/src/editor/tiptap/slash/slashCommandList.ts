import type { Editor } from '@tiptap/react';
import { aiFactCheck, aiRephrase } from '@/editor/ai/aiOps';

export interface SlashItem {
  id: string
  title: string
  hint: string
  icon: string
  keywords: string[]
  command: (editor: Editor) => void | Promise<void>
}

export const SLASH_ITEMS: SlashItem[] = [
    { id: 'h1', title: 'Heading 1', hint: 'Big title', icon: 'H₁', keywords: ['heading', 'h1', 'title'], command: (e) => { e.chain().focus().setHeading({ level: 1 }).run(); } },
    { id: 'h2', title: 'Heading 2', hint: 'Section', icon: 'H₂', keywords: ['heading', 'h2', 'section'], command: (e) => { e.chain().focus().setHeading({ level: 2 }).run(); } },
    { id: 'h3', title: 'Heading 3', hint: 'Subsection', icon: 'H₃', keywords: ['heading', 'h3'], command: (e) => { e.chain().focus().setHeading({ level: 3 }).run(); } },
    { id: 'p', title: 'Body', hint: 'Plain paragraph', icon: '¶', keywords: ['paragraph', 'body', 'text'], command: (e) => { e.chain().focus().setParagraph().run(); } },
    { id: 'quote', title: 'Quote', hint: 'Block quote', icon: '❝', keywords: ['quote', 'blockquote'], command: (e) => { e.chain().focus().setBlockquote().run(); } },
    { id: 'ul', title: 'Bullet list', hint: '• item', icon: '•', keywords: ['list', 'bullet', 'ul'], command: (e) => { e.chain().focus().toggleBulletList().run(); } },
    { id: 'ol', title: 'Numbered list', hint: '1. item', icon: '1.', keywords: ['list', 'numbered', 'ol'], command: (e) => { e.chain().focus().toggleOrderedList().run(); } },
    { id: 'tl', title: 'Task list', hint: '☐ todo', icon: '☑', keywords: ['task', 'todo', 'checklist'], command: (e) => { e.chain().focus().toggleTaskList().run(); } },
    { id: 'code', title: 'Code block', hint: 'Monospaced', icon: '</>', keywords: ['code', 'pre'], command: (e) => { e.chain().focus().toggleCodeBlock().run(); } },
    { id: 'hr', title: 'Divider', hint: 'Horizontal rule', icon: '—', keywords: ['hr', 'divider', 'separator'], command: (e) => { e.chain().focus().setHorizontalRule().run(); } },
    { id: 'fn', title: 'Footnote', hint: '[N] superscript', icon: '¹', keywords: ['footnote', 'note', 'reference'], command: (e) => { const text = window.prompt('Footnote text'); if (text) e.chain().focus().insertFootnote(text).run(); } },
    { id: 'tbl', title: 'Table', hint: '3×3 with header', icon: '⊞', keywords: ['table', 'grid'], command: (e) => { e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); } },
    { id: 'img', title: 'Image', hint: 'From URL', icon: '🖼', keywords: ['image', 'picture', 'photo'], command: (e) => { const url = window.prompt('Image URL'); if (url) e.chain().focus().setImage({ src: url }).run(); } },
    { id: 'ai-rephrase', title: 'AI rephrase', hint: 'Rewrite selection — opens as suggestion', icon: '✨', keywords: ['ai', 'rephrase', 'rewrite', 'fix'], command: async (e) => { await aiRephrase(e); } },
    { id: 'ai-factcheck', title: 'AI fact-check', hint: 'Annotates selection', icon: '🔍', keywords: ['ai', 'fact', 'check', 'verify'], command: async (e) => { await aiFactCheck(e); } },
];

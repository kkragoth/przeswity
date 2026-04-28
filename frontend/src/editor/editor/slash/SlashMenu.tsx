import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { aiRephrase, aiFactCheck } from '../../ai/aiOps';
import type { SlashTriggerInfo } from './SlashCommand';

export interface SlashItem {
  id: string
  title: string
  hint: string
  icon: string
  keywords: string[]
  command: (editor: Editor) => void | Promise<void>
}

const ITEMS: SlashItem[] = [
    {
        id: 'h1',
        title: 'Heading 1',
        hint: 'Big title',
        icon: 'H₁',
        keywords: ['heading', 'h1', 'title'],
        command: (e) => {
            e.chain().focus().setHeading({ level: 1 }).run();
        },
    },
    {
        id: 'h2',
        title: 'Heading 2',
        hint: 'Section',
        icon: 'H₂',
        keywords: ['heading', 'h2', 'section'],
        command: (e) => {
            e.chain().focus().setHeading({ level: 2 }).run();
        },
    },
    {
        id: 'h3',
        title: 'Heading 3',
        hint: 'Subsection',
        icon: 'H₃',
        keywords: ['heading', 'h3'],
        command: (e) => {
            e.chain().focus().setHeading({ level: 3 }).run();
        },
    },
    {
        id: 'p',
        title: 'Body',
        hint: 'Plain paragraph',
        icon: '¶',
        keywords: ['paragraph', 'body', 'text'],
        command: (e) => {
            e.chain().focus().setParagraph().run();
        },
    },
    {
        id: 'quote',
        title: 'Quote',
        hint: 'Block quote',
        icon: '❝',
        keywords: ['quote', 'blockquote'],
        command: (e) => {
            e.chain().focus().setBlockquote().run();
        },
    },
    {
        id: 'ul',
        title: 'Bullet list',
        hint: '• item',
        icon: '•',
        keywords: ['list', 'bullet', 'ul'],
        command: (e) => {
            e.chain().focus().toggleBulletList().run();
        },
    },
    {
        id: 'ol',
        title: 'Numbered list',
        hint: '1. item',
        icon: '1.',
        keywords: ['list', 'numbered', 'ol'],
        command: (e) => {
            e.chain().focus().toggleOrderedList().run();
        },
    },
    {
        id: 'tl',
        title: 'Task list',
        hint: '☐ todo',
        icon: '☑',
        keywords: ['task', 'todo', 'checklist'],
        command: (e) => {
            e.chain().focus().toggleTaskList().run();
        },
    },
    {
        id: 'code',
        title: 'Code block',
        hint: 'Monospaced',
        icon: '</>',
        keywords: ['code', 'pre'],
        command: (e) => {
            e.chain().focus().toggleCodeBlock().run();
        },
    },
    {
        id: 'hr',
        title: 'Divider',
        hint: 'Horizontal rule',
        icon: '—',
        keywords: ['hr', 'divider', 'separator'],
        command: (e) => {
            e.chain().focus().setHorizontalRule().run();
        },
    },
    {
        id: 'fn',
        title: 'Footnote',
        hint: '[N] superscript',
        icon: '¹',
        keywords: ['footnote', 'note', 'reference'],
        command: (e) => {
            const text = window.prompt('Footnote text');
            if (text === null || text === '') return;
            e.chain().focus().insertFootnote(text).run();
        },
    },
    {
        id: 'tbl',
        title: 'Table',
        hint: '3×3 with header',
        icon: '⊞',
        keywords: ['table', 'grid'],
        command: (e) => {
            e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        },
    },
    {
        id: 'img',
        title: 'Image',
        hint: 'From URL',
        icon: '🖼',
        keywords: ['image', 'picture', 'photo'],
        command: (e) => {
            const url = window.prompt('Image URL');
            if (!url) return;
            e.chain().focus().setImage({ src: url }).run();
        },
    },
    {
        id: 'ai-rephrase',
        title: 'AI rephrase',
        hint: 'Rewrite selection — opens as suggestion',
        icon: '✨',
        keywords: ['ai', 'rephrase', 'rewrite', 'fix'],
        command: async (e) => {
            await aiRephrase(e);
        },
    },
    {
        id: 'ai-factcheck',
        title: 'AI fact-check',
        hint: 'Annotates selection',
        icon: '🔍',
        keywords: ['ai', 'fact', 'check', 'verify'],
        command: async (e) => {
            await aiFactCheck(e);
        },
    },
];

interface SlashMenuProps {
  editor: Editor | null
  trigger: SlashTriggerInfo
  onClose: () => void
  onToast?: (msg: string, kind?: 'info' | 'success' | 'error') => void
}

function filterItems(query: string): SlashItem[] {
    const q = query.trim().toLowerCase();
    if (!q) return ITEMS;
    return ITEMS.filter(
        (i) =>
            i.title.toLowerCase().includes(q) ||
      i.keywords.some((k) => k.toLowerCase().startsWith(q) || k.toLowerCase().includes(q)),
    );
}

export function SlashMenu({ editor, trigger, onClose, onToast }: SlashMenuProps) {
    const [activeIdx, setActiveIdx] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

    const items = filterItems(trigger.query);

    useEffect(() => {
        setActiveIdx(0);
    }, [trigger.query]);

    useLayoutEffect(() => {
        if (!ref.current || !trigger.coords) return;
        const rect = ref.current.getBoundingClientRect();
        let left = trigger.coords.left;
        let top = trigger.coords.bottom + 4;
        if (left + rect.width > window.innerWidth - 8) {
            left = Math.max(8, window.innerWidth - rect.width - 8);
        }
        if (top + rect.height > window.innerHeight - 8) {
            top = Math.max(8, trigger.coords.top - rect.height - 4);
        }
        setPos({ left, top });
    }, [trigger.coords, trigger.query, items.length]);

    useEffect(() => {
        if (!editor || !trigger.active) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIdx((i) => (items.length === 0 ? 0 : (i + 1) % items.length));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIdx((i) =>
                    items.length === 0 ? 0 : (i - 1 + items.length) % items.length,
                );
            } else if (e.key === 'Enter') {
                if (items.length === 0) return;
                e.preventDefault();
                runItem(items[activeIdx]);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'Tab') {
                if (items.length === 0) return;
                e.preventDefault();
                runItem(items[activeIdx]);
            }
        };
        document.addEventListener('keydown', onKey, true);
        return () => document.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor, trigger, items, activeIdx]);

    if (!editor || !trigger.active || !trigger.coords || !trigger.range) return null;

    const runItem = async (item: SlashItem) => {
        const range = trigger.range!;
        editor.chain().focus().deleteRange(range).run();
        onClose();
        try {
            await item.command(editor);
        } catch (err) {
            onToast?.(`${item.title} failed: ${(err as Error).message}`, 'error');
        }
    };

    return (
        <div
            ref={ref}
            className="slash-menu"
            style={{ left: pos.left, top: pos.top }}
            onMouseDown={(e) => e.preventDefault()}
        >
            <div className="slash-header">
                {items.length === 0 ? 'No matches' : `${items.length} block${items.length === 1 ? '' : 's'}`}
            </div>
            {items.map((item, i) => (
                <button
                    type="button"
                    key={item.id}
                    className={`slash-item${i === activeIdx ? ' is-active' : ''}`}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => runItem(item)}
                >
                    <span className="slash-icon">{item.icon}</span>
                    <span className="slash-text">
                        <span className="slash-title">{item.title}</span>
                        <span className="slash-hint">{item.hint}</span>
                    </span>
                </button>
            ))}
        </div>
    );
}

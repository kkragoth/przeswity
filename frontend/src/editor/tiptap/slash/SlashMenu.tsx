import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { SlashTriggerInfo } from './SlashCommand';
import { SLASH_ITEMS, type SlashItem } from './slashCommandList';

interface SlashMenuProps {
  editor: Editor | null
  trigger: SlashTriggerInfo
  onClose: () => void
  onToast?: (msg: string, kind?: 'info' | 'success' | 'error') => void
}

function filterItems(query: string): SlashItem[] {
    const q = query.trim().toLowerCase();
    if (!q) return SLASH_ITEMS;
    return SLASH_ITEMS.filter(
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

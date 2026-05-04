import type { Editor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';

enum BlockStyle {
    P = 'p',
    H1 = 'h1',
    H2 = 'h2',
    H3 = 'h3',
    Quote = 'quote',
    BulletList = 'bulletList',
    OrderedList = 'orderedList',
    TaskList = 'taskList',
}

function detectBlockStyle(editor: Editor): BlockStyle {
    if (editor.isActive('heading', { level: 1 })) return BlockStyle.H1;
    if (editor.isActive('heading', { level: 2 })) return BlockStyle.H2;
    if (editor.isActive('heading', { level: 3 })) return BlockStyle.H3;
    if (editor.isActive('blockquote')) return BlockStyle.Quote;
    if (editor.isActive('bulletList')) return BlockStyle.BulletList;
    if (editor.isActive('orderedList')) return BlockStyle.OrderedList;
    if (editor.isActive('taskList')) return BlockStyle.TaskList;
    return BlockStyle.P;
}

function applyBlockStyle(editor: Editor, style: BlockStyle): void {
    const chain = editor.chain().focus();
    switch (style) {
        case BlockStyle.P:           chain.setParagraph().run(); break;
        case BlockStyle.H1:          chain.setHeading({ level: 1 }).run(); break;
        case BlockStyle.H2:          chain.setHeading({ level: 2 }).run(); break;
        case BlockStyle.H3:          chain.setHeading({ level: 3 }).run(); break;
        case BlockStyle.Quote:       chain.setBlockquote().run(); break;
        case BlockStyle.BulletList:  chain.toggleBulletList().run(); break;
        case BlockStyle.OrderedList: chain.toggleOrderedList().run(); break;
        case BlockStyle.TaskList:    chain.toggleTaskList().run(); break;
    }
}

interface StyleItemProps {
    value: BlockStyle
    label: string
    shortcut?: string
}

function previewLabel(value: BlockStyle, label: string): string {
    if (value === BlockStyle.BulletList) return `• ${label}`;
    if (value === BlockStyle.OrderedList) return `1. ${label}`;
    if (value === BlockStyle.TaskList) return `☐ ${label}`;
    return label;
}

function StyleItem({ value, label, shortcut }: StyleItemProps) {
    const previewClass = `style-preview-${value}`;
    return (
        <SelectPrimitive.Item value={value} className="style-select-item">
            <span className={`style-preview ${previewClass}`}>{previewLabel(value, label)}</span>
            {shortcut && <kbd className="style-shortcut">{shortcut}</kbd>}
            <SelectPrimitive.ItemIndicator className="style-item-check">✓</SelectPrimitive.ItemIndicator>
        </SelectPrimitive.Item>
    );
}

interface StyleDropdownProps {
    editor: Editor
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const M = isMac ? '⌘' : 'Ctrl';
const A = isMac ? '⌥' : 'Alt';

export function StyleDropdown({ editor }: StyleDropdownProps) {
    const { t } = useTranslation('editor');
    const current = detectBlockStyle(editor);

    const items: StyleItemProps[] = [
        { value: BlockStyle.P,           label: t('toolbar.style.body'),        shortcut: `${M}${A}0` },
        { value: BlockStyle.H1,          label: t('toolbar.style.h1'),          shortcut: `${M}${A}1` },
        { value: BlockStyle.H2,          label: t('toolbar.style.h2'),          shortcut: `${M}${A}2` },
        { value: BlockStyle.H3,          label: t('toolbar.style.h3'),          shortcut: `${M}${A}3` },
        { value: BlockStyle.Quote,       label: t('toolbar.style.quote'),       shortcut: `${M}⇧B` },
        { value: BlockStyle.BulletList,  label: t('toolbar.style.bulletList'),  shortcut: `${M}⇧8` },
        { value: BlockStyle.OrderedList, label: t('toolbar.style.orderedList'), shortcut: `${M}⇧7` },
        { value: BlockStyle.TaskList,    label: t('toolbar.style.taskList') },
    ];

    const currentLabel = items.find((i) => i.value === current)?.label ?? t('toolbar.style.body');

    return (
        <SelectPrimitive.Root
            value={current}
            onValueChange={(v) => applyBlockStyle(editor, v as BlockStyle)}
        >
            <SelectPrimitive.Trigger className="style-trigger" aria-label={t('toolbar.style.body')}>
                <SelectPrimitive.Value>
                    <span className="style-trigger-label">{currentLabel}</span>
                </SelectPrimitive.Value>
                <ChevronDown size={14} className="style-trigger-chevron" />
            </SelectPrimitive.Trigger>
            <SelectPrimitive.Portal>
                <SelectPrimitive.Content className="style-select-content" position="popper" sideOffset={4}>
                    <SelectPrimitive.Viewport className="style-select-viewport">
                        {items.map((item) => (
                            <StyleItem key={item.value} {...item} />
                        ))}
                    </SelectPrimitive.Viewport>
                </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
    );
}

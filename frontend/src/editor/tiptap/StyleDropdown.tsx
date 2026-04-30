import type { Editor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';

type BlockStyle = 'p' | 'h1' | 'h2' | 'h3' | 'quote' | 'bulletList' | 'orderedList' | 'taskList'

function detectBlockStyle(editor: Editor): BlockStyle {
    if (editor.isActive('heading', { level: 1 })) return 'h1';
    if (editor.isActive('heading', { level: 2 })) return 'h2';
    if (editor.isActive('heading', { level: 3 })) return 'h3';
    if (editor.isActive('blockquote')) return 'quote';
    if (editor.isActive('bulletList')) return 'bulletList';
    if (editor.isActive('orderedList')) return 'orderedList';
    if (editor.isActive('taskList')) return 'taskList';
    return 'p';
}

function applyBlockStyle(editor: Editor, style: BlockStyle): void {
    const chain = editor.chain().focus();
    switch (style) {
        case 'p':          chain.setParagraph().run(); break;
        case 'h1':         chain.setHeading({ level: 1 }).run(); break;
        case 'h2':         chain.setHeading({ level: 2 }).run(); break;
        case 'h3':         chain.setHeading({ level: 3 }).run(); break;
        case 'quote':      chain.setBlockquote().run(); break;
        case 'bulletList': chain.toggleBulletList().run(); break;
        case 'orderedList':chain.toggleOrderedList().run(); break;
        case 'taskList':   chain.toggleTaskList().run(); break;
    }
}

interface StyleItemProps {
    value: BlockStyle
    label: string
    shortcut?: string
}

function StyleItem({ value, label, shortcut }: StyleItemProps) {
    const previewClass = `style-preview-${value}`;
    return (
        <SelectPrimitive.Item value={value} className="style-select-item">
            <span className={`style-preview ${previewClass}`}>
                {value === 'bulletList' ? `• ${label}` :
                    value === 'orderedList' ? `1. ${label}` :
                        value === 'taskList' ? `☐ ${label}` :
                            label}
            </span>
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
        { value: 'p',           label: t('toolbar.style.body'),        shortcut: `${M}${A}0` },
        { value: 'h1',          label: t('toolbar.style.h1'),          shortcut: `${M}${A}1` },
        { value: 'h2',          label: t('toolbar.style.h2'),          shortcut: `${M}${A}2` },
        { value: 'h3',          label: t('toolbar.style.h3'),          shortcut: `${M}${A}3` },
        { value: 'quote',       label: t('toolbar.style.quote'),       shortcut: `${M}⇧B` },
        { value: 'bulletList',  label: t('toolbar.style.bulletList'),  shortcut: `${M}⇧8` },
        { value: 'orderedList', label: t('toolbar.style.orderedList'), shortcut: `${M}⇧7` },
        { value: 'taskList',    label: t('toolbar.style.taskList') },
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

import type { Editor } from '@tiptap/react';
import { ContextMenu } from '@/editor/shell/ContextMenu';
import { deleteBlock, duplicateBlock, moveBlock } from '@/editor/tiptap/blocks/blockOps';
import type { useBlockMenu } from '@/editor/tiptap/blocks/useBlockMenu';

export function BlockMenu({ state, editor, t }: { state: ReturnType<typeof useBlockMenu>; editor: Editor; t: (...args: any[]) => string }) {
    if (!state.openAt) return null;
    const pos = state.openAt.pos;
    const items = [
        { label: t('blockMenu.moveUp'), icon: '↑', shortcut: '⌥⇧↑', action: () => { void moveBlock(editor, pos, 'up'); } },
        { label: t('blockMenu.moveDown'), icon: '↓', shortcut: '⌥⇧↓', action: () => { void moveBlock(editor, pos, 'down'); } },
        { label: '', separator: true },
        { label: t('blockMenu.duplicate'), icon: '⎘', shortcut: '⌘D', action: () => { void duplicateBlock(editor, pos); } },
        { label: '', separator: true },
        { label: t('blockMenu.deleteBlock'), icon: '🗑', danger: true, action: () => { void deleteBlock(editor, pos); } },
    ];
    return <ContextMenu x={state.openAt.rect.right + 6} y={state.openAt.rect.top} items={items} onClose={state.close} />;
}

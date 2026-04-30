import type { ContextMenuItem } from '@/editor/shell/ContextMenu';
import type { BuildContextArgs } from '@/editor/tiptap/contextItems/types';
import { ROLE_PERMISSIONS } from '@/editor/identity/types';

export function clipboardItems(args: BuildContextArgs): ContextMenuItem[] {
    const perms = ROLE_PERMISSIONS[args.user.role];
    return [
        {
            label: 'Cut',
            shortcut: '⌘X',
            icon: '✂',
            disabled: !args.hasSelection || !perms.canEdit,
            action: () => {
                args.editor.commands.focus();
                document.execCommand('cut');
            },
        },
        {
            label: 'Copy',
            shortcut: '⌘C',
            icon: '⧉',
            disabled: !args.hasSelection,
            action: () => {
                args.editor.commands.focus();
                document.execCommand('copy');
            },
        },
        {
            label: 'Paste',
            shortcut: '⌘V',
            icon: '⌫',
            disabled: !perms.canEdit && !perms.canSuggest,
            action: () => {
                args.editor.commands.focus();
                try { document.execCommand('paste'); } catch {}
            },
        },
    ];
}

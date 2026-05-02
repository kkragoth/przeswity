import * as Y from 'yjs';
import { CommentStatus, type CommentThread } from '@/editor/comments/types';
import { ROLE_PERMISSIONS } from '@/editor/identity/types';
import { makeId } from '@/editor/utils';
import type { ContextMenuItem } from '@/editor/shell/ContextMenu';
import type { BuildContextArgs, MarkSet } from '@/editor/tiptap/contextItems/types';

export function commentItems(args: BuildContextArgs, marks: MarkSet): ContextMenuItem[] {
    const perms = ROLE_PERMISSIONS[args.user.role];
    if (marks.commentMark) {
        const id = marks.commentMark.attrs.commentId as string;
        const items: ContextMenuItem[] = [{ label: '', separator: true }, { label: 'Open comment thread', icon: '💬', action: () => args.callbacks.onActiveCommentChange(id) }];
        if (perms.canResolveComment) {
            items.push(
                {
                    label: 'Resolve comment',
                    icon: '✓',
                    action: () => {
                        const map = args.doc.getMap('comments') as Y.Map<CommentThread>;
                        const thread = map.get(id);
                        if (thread) map.set(id, { ...thread, status: CommentStatus.Resolved, resolvedBy: args.user.name, resolvedAt: Date.now() });
                        args.editor.chain().focus().unsetComment(id).run();
                    },
                },
                {
                    label: 'Remove comment',
                    icon: '🗑',
                    danger: true,
                    action: () => {
                        const map = args.doc.getMap('comments') as Y.Map<CommentThread>;
                        map.delete(id);
                        args.editor.chain().focus().unsetComment(id).run();
                    },
                },
            );
        }
        return items;
    }
    if (!args.hasSelection || !perms.canComment) return [];
    return [{
        label: 'Add comment',
        shortcut: '⌘⌥M',
        icon: '💬',
        action: () => {
            const { from, to } = args.editor.state.selection;
            if (from === to) return;
            const id = makeId();
            const quote = args.editor.state.doc.textBetween(from, to, ' ');
            args.editor.chain().focus().setComment(id).run();
            args.callbacks.onCreateComment(id, quote);
        },
    }];
}

import type { ContextMenuItem } from '@/editor/shell/ContextMenu';
import { acceptSuggestion, rejectSuggestion } from '@/editor/suggestions/suggestionOps';
import type { BuildContextArgs, MarkSet } from '@/editor/tiptap/contextItems/types';
import { permsFor } from '@/editor/identity/perms';

function suggestionKindLabel(marks: MarkSet): string {
    if (marks.insertionMark && marks.deletionMark) return 'change';
    if (marks.insertionMark) return 'insertion';
    return 'deletion';
}

export function suggestionItems(args: BuildContextArgs, marks: MarkSet): ContextMenuItem[] {
    const perms = permsFor(args.user.role);
    if (!perms.canResolveSuggestion) return [];
    const mark = marks.insertionMark ?? marks.deletionMark;
    if (!mark) return [];
    const id = mark.attrs.suggestionId as string;
    const author = (mark.attrs.authorName as string) ?? 'someone';
    const kind = suggestionKindLabel(marks);
    return [
        { label: '', separator: true },
        { label: `Accept ${kind} by ${author}`, icon: '✓', action: () => acceptSuggestion(args.editor, id) },
        { label: `Reject ${kind} by ${author}`, icon: '✗', danger: true, action: () => rejectSuggestion(args.editor, id) },
    ];
}

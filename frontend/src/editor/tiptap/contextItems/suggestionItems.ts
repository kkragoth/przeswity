import type { ContextMenuItem } from '@/editor/shell/ContextMenu';
import { acceptSuggestion, rejectSuggestion, SuggestionType } from '@/editor/suggestions/suggestionOps';
import type { BuildContextArgs, MarkSet } from '@/editor/tiptap/contextItems/types';
import { permsFor } from '@/editor/identity/perms';

export function suggestionItems(args: BuildContextArgs, marks: MarkSet): ContextMenuItem[] {
    const perms = permsFor(args.user.role);
    if (!perms.canResolveSuggestion) return [];
    const mark = marks.insertionMark ?? marks.deletionMark;
    if (!mark) return [];
    const type = marks.insertionMark ? SuggestionType.Insertion : SuggestionType.Deletion;
    const id = mark.attrs.suggestionId as string;
    const author = (mark.attrs.authorName as string) ?? 'someone';
    return [
        { label: '', separator: true },
        { label: `Accept ${type} by ${author}`, icon: '✓', action: () => acceptSuggestion(args.editor, id, type) },
        { label: `Reject ${type} by ${author}`, icon: '✗', danger: true, action: () => rejectSuggestion(args.editor, id, type) },
    ];
}

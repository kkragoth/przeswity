import type { BookSummary } from '@/api/generated/types.gen';
import { daysSince } from '@/lib/dates';
import { isAttentionBook, isRecentBook } from '@/lib/status';

export type DashboardView = 'list' | 'timeline';
export type QuickFilter = 'all' | 'attention' | 'recent' | 'unassigned';

export function isActiveWithinDays(book: BookSummary, days: number): boolean {
    return daysSince(book.lastEditAt ?? book.stageChangedAt) <= days;
}

export function filterBooks(
    books: BookSummary[],
    meId: string,
    showOnlyMine: boolean,
    quickFilter: QuickFilter,
    roleFilter: string,
): BookSummary[] {
    const scoped = showOnlyMine ? books.filter((b) => b.createdById === meId) : books;
    return scoped.filter((b) => {
        if (quickFilter === 'attention' && !isAttentionBook(b)) return false;
        if (quickFilter === 'recent' && !isRecentBook(b)) return false;
        if (quickFilter === 'unassigned' && b.assigneeCount > 0) return false;
        if (roleFilter !== 'all' && !b.myRoles.includes(roleFilter)) return false;
        return true;
    });
}

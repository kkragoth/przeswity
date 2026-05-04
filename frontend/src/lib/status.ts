import type { BookSummary } from '@/api/generated/types.gen';
import { daysSince } from '@/lib/dates';
import { STALE_THRESHOLD_DAYS, RECENT_THRESHOLD_DAYS } from '@/lib/constants';

export enum BookAttention {
    Stale = 'stale',
    Active = 'active',
    Normal = 'normal',
}

export function isStaleDays(days: number): boolean {
    return days > STALE_THRESHOLD_DAYS;
}

export function isAttentionBook(book: BookSummary): boolean {
    return book.assigneeCount === 0 || isStaleDays(daysSince(book.lastEditAt ?? book.stageChangedAt));
}

export function isRecentBook(book: BookSummary): boolean {
    return daysSince(book.lastEditAt ?? book.stageChangedAt) <= RECENT_THRESHOLD_DAYS;
}

export function bookAttention(book: BookSummary): BookAttention {
    if (isAttentionBook(book)) return BookAttention.Stale;
    if (isRecentBook(book)) return BookAttention.Active;
    return BookAttention.Normal;
}


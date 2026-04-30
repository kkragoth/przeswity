import type { Book, BookSummary } from '@/api/generated/types.gen';
import { daysSince } from '@/lib/dates';

export enum BookAttention {
    Stale = 'stale',
    Active = 'active',
    Normal = 'normal',
}

export function isStaleDays(days: number): boolean {
    return days > 14;
}

export function isAttentionBook(book: BookSummary): boolean {
    return book.assigneeCount === 0 || isStaleDays(daysSince(book.lastEditAt ?? book.stageChangedAt));
}

export function isRecentBook(book: BookSummary): boolean {
    return daysSince(book.lastEditAt ?? book.stageChangedAt) <= 2;
}

export function bookAttention(book: BookSummary): BookAttention {
    if (isAttentionBook(book)) return BookAttention.Stale;
    if (isRecentBook(book)) return BookAttention.Active;
    return BookAttention.Normal;
}

export function allowedNextStages(stage: Book['stage']): Book['stage'][] {
    const map: Record<Book['stage'], Book['stage'][]> = {
        translation: ['editing'],
        editing: ['authorization', 'proofreading'],
        authorization: ['proofreading', 'editing'],
        proofreading: ['applying_changes', 'editing'],
        applying_changes: ['typesetting', 'proofreading'],
        typesetting: ['post_typeset_proof'],
        post_typeset_proof: ['finalization', 'applying_changes'],
        finalization: [],
    };
    return map[stage];
}

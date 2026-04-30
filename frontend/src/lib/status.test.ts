import { describe, expect, it } from 'vitest';
import { allowedNextStages, bookAttention, BookAttention, isAttentionBook, isRecentBook, isStaleDays } from '@/lib/status';
import type { BookSummary } from '@/api/generated/types.gen';

function book(overrides: Partial<BookSummary>): BookSummary {
    return {
        id: 'b1',
        title: 'Book',
        description: '',
        stage: 'editing',
        progress: 20,
        assigneeCount: 1,
        createdById: 'u1',
        myRoles: [],
        createdAt: '2026-04-20T00:00:00.000Z',
        stageChangedAt: '2026-04-20T00:00:00.000Z',
        lastEditAt: '2026-04-29T00:00:00.000Z',
        updatedById: null,
        ...overrides,
    } as BookSummary;
}

describe('status helpers', () => {
    it('flags stale days over 14', () => {
        expect(isStaleDays(14)).toBe(false);
        expect(isStaleDays(15)).toBe(true);
    });

    it('marks unassigned as attention', () => {
        expect(isAttentionBook(book({ assigneeCount: 0 }))).toBe(true);
    });

    it('marks very recent as recent', () => {
        expect(isRecentBook(book({ lastEditAt: new Date().toISOString() }))).toBe(true);
    });

    it('returns attention enum', () => {
        expect(bookAttention(book({ assigneeCount: 0 }))).toBe(BookAttention.Stale);
    });

    it('keeps stage transitions typed', () => {
        expect(allowedNextStages('translation')).toEqual(['editing']);
    });
});

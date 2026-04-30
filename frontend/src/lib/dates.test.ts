import { describe, expect, it } from 'vitest';
import { daysSince, formatActivity, MISSING_DATE_DAYS } from '@/lib/dates';

describe('daysSince', () => {
    const now = new Date('2026-04-29T12:00:00.000Z');
    const getNow = () => now;

    it('returns one day for yesterday', () => {
        expect(daysSince('2026-04-28T12:00:00.000Z', getNow)).toBe(1);
    });

    it('returns sentinel for missing dates', () => {
        expect(daysSince(undefined, getNow)).toBe(MISSING_DATE_DAYS);
    });
});

describe('formatActivity', () => {
    const now = new Date('2026-04-29T12:00:00.000Z');
    const getNow = () => now;
    const t = (key: string, options?: Record<string, unknown>) => {
        if (key === 'books.card.activityDaysAgo') return `${String(options?.count)} days ago`;
        if (key === 'books.card.activityToday') return 'today';
        if (key === 'books.card.activityYesterday') return 'yesterday';
        if (key === 'books.card.noActivity') return 'no activity';
        return key;
    };

    it('returns X days ago over 30 days', () => {
        expect(formatActivity('2026-03-20T12:00:00.000Z', t as never, getNow)).toBe('40 days ago');
    });
});

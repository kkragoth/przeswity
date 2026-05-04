import { describe, expect, it } from 'vitest';
import { daysSince, formatActivity } from '@/lib/dates';
import { MISSING_DATE_DAYS } from '@/lib/constants';

describe('daysSince', () => {
    const now = new Date('2026-04-29T12:00:00.000Z');
    const getNow = () => now;

    it('returns one day for yesterday', () => {
        expect(daysSince('2026-04-28T12:00:00.000Z', getNow)).toBe(1);
    });

    it('returns sentinel for missing dates', () => {
        expect(daysSince(undefined, getNow)).toBe(MISSING_DATE_DAYS);
    });

    it('returns zero for today', () => {
        expect(daysSince('2026-04-29T06:00:00.000Z', getNow)).toBe(0);
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

    it('returns no activity for null', () => {
        expect(formatActivity(null, t as never, getNow)).toBe('no activity');
    });

    it('returns today for same-day activity', () => {
        expect(formatActivity('2026-04-29T06:00:00.000Z', t as never, getNow)).toBe('today');
    });

    it('returns yesterday for 1-day-old activity', () => {
        expect(formatActivity('2026-04-28T12:00:00.000Z', t as never, getNow)).toBe('yesterday');
    });

    it('returns X days ago over 30 days', () => {
        expect(formatActivity('2026-03-20T12:00:00.000Z', t as never, getNow)).toBe('40 days ago');
    });
});

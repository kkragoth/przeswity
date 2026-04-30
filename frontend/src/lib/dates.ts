import type { TFunction } from 'i18next';

export const MISSING_DATE_DAYS = 999;

export function daysSince(
    dateLike: string | Date | null | undefined,
    now: () => Date = () => new Date(),
): number {
    if (!dateLike) return MISSING_DATE_DAYS;
    const at = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
    const delta = now().getTime() - at.getTime();
    return Math.max(0, Math.floor(delta / (1000 * 60 * 60 * 24)));
}

export function formatActivity(
    date: string | Date | null | undefined,
    t: TFunction,
    now: () => Date = () => new Date(),
): string {
    if (!date) return t('books.card.noActivity');
    const d = daysSince(date, now);
    if (d === 0) return t('books.card.activityToday');
    if (d === 1) return t('books.card.activityYesterday');
    return t('books.card.activityDaysAgo', { count: d });
}

import type { TFunction } from 'i18next';
import { MISSING_DATE_DAYS } from '@/lib/constants';
const ONE_MINUTE_MS = 60_000;
const ONE_HOUR_MS = 3_600_000;
const ONE_DAY_MS = 86_400_000;

export function formatRelativeTime(
    ts: number,
    locale: string,
    t: TFunction<'editor'>,
    now: () => number = () => Date.now(),
): string {
    const diff = now() - ts;
    if (diff < ONE_MINUTE_MS) return t('comments.time.justNow');
    if (diff < ONE_HOUR_MS) return t('comments.time.minutesAgo', { count: Math.floor(diff / ONE_MINUTE_MS) });
    if (diff < ONE_DAY_MS) return t('comments.time.hoursAgo', { count: Math.floor(diff / ONE_HOUR_MS) });
    return new Date(ts).toLocaleDateString(locale);
}

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

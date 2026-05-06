export enum DayBucketKind {
    Today = 'today',
    Yesterday = 'yesterday',
    Earlier = 'earlier',
}

export interface DayBucket {
    kind: DayBucketKind;
    key: string;
    date: Date;
}

export interface TimeLabels {
    today: string;
    yesterday: string;
    justNow: string;
    minutesAgo: (count: number) => string;
    hoursAgo: (count: number) => string;
}

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;

function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function dayBucket(iso: string, now = new Date()): DayBucket {
    const d = new Date(iso);
    const today = startOfDay(now);
    const day = startOfDay(d);
    const diffDays = Math.round((today.getTime() - day.getTime()) / (24 * MS_PER_HOUR));

    if (diffDays <= 0) return { kind: DayBucketKind.Today, key: 'today', date: day };
    if (diffDays === 1) return { kind: DayBucketKind.Yesterday, key: 'yesterday', date: day };
    return { kind: DayBucketKind.Earlier, key: day.toISOString().slice(0, 10), date: day };
}

export function dayBucketLabel(bucket: DayBucket, labels: TimeLabels, locale?: string): string {
    if (bucket.kind === DayBucketKind.Today) return labels.today;
    if (bucket.kind === DayBucketKind.Yesterday) return labels.yesterday;
    return bucket.date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function shortTime(iso: string, locale?: string): string {
    return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function relativeTime(iso: string, labels: TimeLabels, now = new Date()): string {
    const then = new Date(iso).getTime();
    const diffMs = now.getTime() - then;

    if (diffMs < MS_PER_MINUTE) return labels.justNow;
    if (diffMs < MS_PER_HOUR) {
        const mins = Math.floor(diffMs / MS_PER_MINUTE);
        return labels.minutesAgo(mins);
    }
    if (diffMs < 24 * MS_PER_HOUR) {
        const hours = Math.floor(diffMs / MS_PER_HOUR);
        return labels.hoursAgo(hours);
    }
    const bucket = dayBucket(iso, now);
    if (bucket.kind === DayBucketKind.Yesterday) {
        return `${labels.yesterday} ${shortTime(iso)}`;
    }
    return `${bucket.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${shortTime(iso)}`;
}

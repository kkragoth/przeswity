import { Link } from '@tanstack/react-router';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { BookSummary } from '@/api/generated/types.gen';
import { daysSince } from '@/lib/dates';
import { isAttentionBook } from '@/lib/status';

function formatLastActivity(activityAt: string | null, t: ReturnType<typeof useTranslation>['t'], tc: ReturnType<typeof useTranslation>['t']) {
    if (!activityAt) return t('dashboard.activity.none');
    const d = daysSince(activityAt);
    if (d === 0) return t('dashboard.activity.today');
    if (d === 1) return t('dashboard.activity.yesterday');
    return tc('books.card.activityDaysAgo', { count: d });
}

export function BooksTimeline({ books, loading }: { books: ReadonlyArray<BookSummary>; loading: boolean }) {
    const { t } = useTranslation('coordinator');
    const { t: tc } = useTranslation('common');
    if (loading) return <p className="mt-6 text-sm text-muted-foreground">{tc('states.loading')}</p>;
    if (books.length === 0) return <p className="mt-6 text-sm text-muted-foreground">{t('dashboard.noTimeline')}</p>;
    return (
        <div className="mt-4 space-y-2 rounded-lg border bg-card p-4">
            {books.map((book) => <BooksTimelineRow key={book.id} book={book} />)}
        </div>
    );
}

const BooksTimelineRow = memo(function BooksTimelineRow({ book }: { book: BookSummary }) {
    const { t } = useTranslation('coordinator');
    const { t: tc } = useTranslation('common');
    const d = daysSince(book.lastEditAt ?? book.stageChangedAt);
    const ratio = Math.max(0, Math.min(100, 100 - Math.round((d / 21) * 100)));
    return (
        <Link to="/books/$bookId" params={{ bookId: book.id }} className="block rounded-md p-2 transition-colors hover:bg-muted/40">
            <div className="flex items-center gap-3">
                <p className="w-52 shrink-0 truncate text-sm font-medium">{book.title}</p>
                <div className="h-2 flex-1 rounded-full bg-muted"><div className={`h-2 rounded-full ${isAttentionBook(book) ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${ratio}%` }} /></div>
                <p className="w-32 shrink-0 text-right text-xs text-muted-foreground">{formatLastActivity(book.lastEditAt ?? book.stageChangedAt, t, tc)}</p>
            </div>
        </Link>
    );
});

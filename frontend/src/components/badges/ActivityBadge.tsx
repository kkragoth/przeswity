import { useTranslation } from 'react-i18next';
import type { BookSummary } from '@/api/generated/types.gen';
import { Badge } from '@/components/ui/badge';
import { BookAttention, bookAttention, isAttentionBook, isRecentBook } from '@/lib/status';
import { assertNever } from '@/lib/assert';

export type ActivityBadgeVariant = 'book' | 'coordinator';

export function ActivityBadge({ book, variant = 'book' }: { book: BookSummary; variant?: ActivityBadgeVariant }) {
    const { t } = useTranslation('common');
    const { t: tc } = useTranslation('coordinator');

    if (variant === 'coordinator') {
        if (book.assigneeCount === 0) return <Badge variant="destructive">{tc('dashboard.status.unassigned')}</Badge>;
        if (isAttentionBook(book)) return <Badge variant="destructive">{tc('dashboard.status.attention')}</Badge>;
        if (isRecentBook(book)) return <Badge className="bg-primary text-primary-foreground">{tc('dashboard.status.recent')}</Badge>;
        return <Badge variant="secondary">{tc('dashboard.status.stable')}</Badge>;
    }

    const status = bookAttention(book);
    switch (status) {
        case BookAttention.Stale:
            return <Badge variant="destructive">{t('books.status.needsAttention')}</Badge>;
        case BookAttention.Active:
            return <Badge className="bg-primary text-primary-foreground">{t('books.status.active')}</Badge>;
        case BookAttention.Normal:
            return <Badge variant="secondary">{t('books.status.inProgress')}</Badge>;
        default:
            return assertNever(status);
    }
}

import { useTranslation } from 'react-i18next';
import type { BookSummary } from '@/api/generated/types.gen';
import { Badge } from '@/components/ui/badge';
import { BookAttention, bookAttention } from '@/lib/status';

export function BookStatusBadge({ book }: { book: BookSummary }) {
    const { t } = useTranslation('common');
    const status = bookAttention(book);
    if (status === BookAttention.Stale) return <Badge variant="destructive">{t('books.status.needsAttention')}</Badge>;
    if (status === BookAttention.Active) return <Badge className="bg-primary text-primary-foreground">{t('books.status.active')}</Badge>;
    return <Badge variant="secondary">{t('books.status.inProgress')}</Badge>;
}

import { useTranslation } from 'react-i18next';
import type { BookSummary } from '@/api/generated/types.gen';
import { Badge } from '@/components/ui/badge';
import { isAttentionBook, isRecentBook } from '@/lib/status';

export function CoordinatorStatusBadge({ book }: { book: BookSummary }) {
    const { t } = useTranslation('coordinator');
    if (book.assigneeCount === 0) return <Badge variant="destructive">{t('dashboard.status.unassigned')}</Badge>;
    if (isAttentionBook(book)) return <Badge variant="destructive">{t('dashboard.status.attention')}</Badge>;
    if (isRecentBook(book)) return <Badge className="bg-primary text-primary-foreground">{t('dashboard.status.recent')}</Badge>;
    return <Badge variant="secondary">{t('dashboard.status.stable')}</Badge>;
}

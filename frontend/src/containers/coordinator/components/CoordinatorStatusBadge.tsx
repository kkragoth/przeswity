import type { BookSummary } from '@/api/generated/types.gen';
import { ActivityBadge } from '@/components/badges/ActivityBadge';

export function CoordinatorStatusBadge({ book }: { book: BookSummary }) {
    return <ActivityBadge book={book} variant="coordinator" />;
}

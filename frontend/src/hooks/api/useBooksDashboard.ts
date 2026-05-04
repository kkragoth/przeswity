import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { booksListOptions } from '@/api/generated/@tanstack/react-query.gen';
import type { SessionUser } from '@/auth/types';
import { isAttentionBook, isRecentBook } from '@/lib/status';
import { filterBooks, isActiveWithinDays } from '@/containers/coordinator/hooks/booksDashboardSelectors';
import { useBooksDashboardFilters } from '@/containers/coordinator/hooks/useBooksDashboardFilters';

export function useBooksDashboard(me: SessionUser) {
    const { filters, setFilter } = useBooksDashboardFilters();
    const { showOnlyMine, quickFilter, roleFilter } = filters;

    const { data: books = [], isLoading } = useQuery({
        ...booksListOptions(),
    });

    const scoped = useMemo(
        () => (showOnlyMine ? books.filter((b) => b.createdById === me.id) : books),
        [books, me.id, showOnlyMine],
    );
    const visible = useMemo(
        () => filterBooks(books, me.id, showOnlyMine, quickFilter, roleFilter),
        [books, me.id, showOnlyMine, quickFilter, roleFilter],
    );
    const kpis = useMemo(() => ({
        attention: scoped.filter((b) => isAttentionBook(b)).length,
        recent: scoped.filter((b) => isRecentBook(b)).length,
        unassigned: scoped.filter((b) => b.assigneeCount === 0).length,
        activeWeek: scoped.filter((b) => isActiveWithinDays(b, 7)).length,
    }), [scoped]);
    const roleOptions = useMemo(
        () => Array.from(new Set(scoped.flatMap((b) => b.myRoles))).sort(),
        [scoped],
    );

    return { books, scoped, visible, kpis, filters, setFilter, isLoading, roleOptions };
}

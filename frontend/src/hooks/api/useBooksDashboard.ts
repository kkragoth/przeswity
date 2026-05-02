import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { booksListOptions } from '@/api/generated/@tanstack/react-query.gen';
import type { SessionUser } from '@/auth/types';
import { isAttentionBook, isRecentBook } from '@/lib/status';
import { DashboardView, QuickFilter, filterBooks, isActiveWithinDays } from '@/containers/coordinator/hooks/booksDashboardSelectors';

export function useBooksDashboard(me: SessionUser) {
    const [showOnlyMine, setShowOnlyMine] = useState(true);
    const [view, setView] = useState<DashboardView>(DashboardView.List);
    const [quickFilter, setQuickFilter] = useState<QuickFilter>(QuickFilter.All);
    const [roleFilter, setRoleFilter] = useState<string>('all');

    const { data: books = [], isLoading } = useQuery({
        ...booksListOptions(),
    });

    const scoped = useMemo(() => (showOnlyMine ? books.filter((b) => b.createdById === me.id) : books), [books, me.id, showOnlyMine]);
    const visible = useMemo(() => filterBooks(books, me.id, showOnlyMine, quickFilter, roleFilter), [books, me.id, showOnlyMine, quickFilter, roleFilter]);
    const kpis = useMemo(() => ({
        attention: scoped.filter((b) => isAttentionBook(b)).length,
        recent: scoped.filter((b) => isRecentBook(b)).length,
        unassigned: scoped.filter((b) => b.assigneeCount === 0).length,
        activeWeek: scoped.filter((b) => isActiveWithinDays(b, 7)).length,
    }), [scoped]);
    const roleOptions = useMemo(() => Array.from(new Set(scoped.flatMap((b) => b.myRoles))).sort(), [scoped]);
    const filters = useMemo(() => ({ showOnlyMine, view, quickFilter, roleFilter }), [showOnlyMine, view, quickFilter, roleFilter]);
    const setFilter = {
        setShowOnlyMine,
        setView,
        setQuickFilter,
        setRoleFilter,
    };

    return {
        books,
        scoped,
        visible,
        kpis,
        filters,
        setFilter,
        isLoading,
        roleOptions,
    };
}

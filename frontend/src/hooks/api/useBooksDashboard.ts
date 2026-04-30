import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { booksList } from '@/api/generated/services.gen';
import type { SessionUser } from '@/auth/types';
import { isAttentionBook, isRecentBook } from '@/lib/status';
import { filterBooks, type DashboardView, type QuickFilter, isActiveWithinDays } from '@/containers/coordinator/hooks/booksDashboardSelectors';

export function useBooksDashboard(me: SessionUser) {
    const [showOnlyMine, setShowOnlyMine] = useState(true);
    const [view, setView] = useState<DashboardView>('list');
    const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const onSetShowOnlyMine = useCallback((next: boolean) => setShowOnlyMine(next), []);
    const onSetView = useCallback((next: DashboardView) => setView(next), []);
    const onSetQuickFilter = useCallback((next: QuickFilter) => setQuickFilter(next), []);
    const onSetRoleFilter = useCallback((next: string) => setRoleFilter(next), []);

    const { data: books = [], isLoading } = useQuery({
        queryKey: ['books'],
        queryFn: async () => (await booksList()).data ?? [],
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
    const setFilter = useMemo(() => ({
        setShowOnlyMine: onSetShowOnlyMine,
        setView: onSetView,
        setQuickFilter: onSetQuickFilter,
        setRoleFilter: onSetRoleFilter,
    }), [onSetQuickFilter, onSetRoleFilter, onSetShowOnlyMine, onSetView]);

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

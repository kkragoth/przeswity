import { useLocalStorageState } from '@/utils/storage/useLocalStorageState';
import { DashboardView, QuickFilter } from '@/containers/coordinator/hooks/booksDashboardSelectors';

interface DashboardFilters {
    showOnlyMine: boolean;
    view: DashboardView;
    quickFilter: QuickFilter;
    roleFilter: string;
}

const INITIAL: DashboardFilters = {
    showOnlyMine: true,
    view: DashboardView.List,
    quickFilter: QuickFilter.All,
    roleFilter: 'all',
};

export function useBooksDashboardFilters() {
    const [filters, setFilters] = useLocalStorageState<DashboardFilters>(
        'coordinator-filters.v1',
        INITIAL,
    );

    const setShowOnlyMine = (v: boolean) => setFilters((f) => ({ ...f, showOnlyMine: v }));
    const setView = (v: DashboardView) => setFilters((f) => ({ ...f, view: v }));
    const setQuickFilter = (v: QuickFilter) => setFilters((f) => ({ ...f, quickFilter: v }));
    const setRoleFilter = (v: string) => setFilters((f) => ({ ...f, roleFilter: v }));

    return {
        filters,
        setFilter: { setShowOnlyMine, setView, setQuickFilter, setRoleFilter },
    };
}

import { useNavigate } from '@tanstack/react-router';
import { CalendarClock, CircleAlert, Filter, MessageSquareText, Plus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SessionUser } from '@/auth/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BooksList } from '@/containers/coordinator/components/BooksList';
import { BooksTimeline } from '@/containers/coordinator/components/BooksTimeline';
import { FilterChip } from '@/containers/coordinator/components/FilterChip';
import { KpiCard } from '@/containers/coordinator/components/KpiCard';
import { useBooksDashboard } from '@/hooks/api/useBooksDashboard';

export function CoordinatorDashboard({ me }: { me: SessionUser }) {
    const { t } = useTranslation('coordinator');
    const navigate = useNavigate();
    const d = useBooksDashboard(me);

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground">{t('greeting', { name: me.name ?? me.email })} · {t('dashboard.activeProjects', { count: d.scoped.length })}</p>
                </div>
                <Button className="gap-2" onClick={() => navigate({ to: '/coordinator/books/new' })}><Plus className="h-4 w-4" />{t('newBook')}</Button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label={t('dashboard.kpi.attention')} value={d.kpis.attention} icon={CircleAlert} tone="danger" onClick={() => d.setFilter.setQuickFilter('attention')} />
                <KpiCard label={t('dashboard.kpi.recent')} value={d.kpis.recent} icon={MessageSquareText} tone="primary" onClick={() => d.setFilter.setQuickFilter('recent')} />
                <KpiCard label={t('dashboard.kpi.activeWeek')} value={d.kpis.activeWeek} icon={CalendarClock} onClick={() => d.setFilter.setQuickFilter('all')} />
                <KpiCard label={t('dashboard.kpi.unassigned')} value={d.kpis.unassigned} icon={Users} onClick={() => d.setFilter.setQuickFilter('unassigned')} />
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
                <FilterChip active={d.filters.showOnlyMine} onClick={() => d.setFilter.setShowOnlyMine(true)}>{t('books.filterMine')}</FilterChip>
                <FilterChip active={!d.filters.showOnlyMine} onClick={() => d.setFilter.setShowOnlyMine(false)}>{t('books.filterAll')}</FilterChip>
                <div className="mx-1 h-5 w-px bg-border" />
                <FilterChip active={d.filters.view === 'list'} onClick={() => d.setFilter.setView('list')}>{t('dashboard.view.list')}</FilterChip>
                <FilterChip active={d.filters.view === 'timeline'} onClick={() => d.setFilter.setView('timeline')}>{t('dashboard.view.timeline')}</FilterChip>
                <div className="mx-1 h-5 w-px bg-border" />
                <FilterChip active={d.filters.quickFilter === 'all'} onClick={() => d.setFilter.setQuickFilter('all')}>{t('dashboard.quick.all')}</FilterChip>
                <FilterChip active={d.filters.quickFilter === 'attention'} onClick={() => d.setFilter.setQuickFilter('attention')}>{t('dashboard.quick.attention')}</FilterChip>
                <FilterChip active={d.filters.quickFilter === 'recent'} onClick={() => d.setFilter.setQuickFilter('recent')}>{t('dashboard.quick.recent')}</FilterChip>
                <FilterChip active={d.filters.quickFilter === 'unassigned'} onClick={() => d.setFilter.setQuickFilter('unassigned')}>{t('dashboard.quick.unassigned')}</FilterChip>
            </div>
            {d.roleOptions.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-1 text-xs text-muted-foreground"><Filter className="h-3 w-3" />{t('dashboard.role')}</Badge>
                    <FilterChip active={d.filters.roleFilter === 'all'} onClick={() => d.setFilter.setRoleFilter('all')}>{t('dashboard.quick.all')}</FilterChip>
                    {d.roleOptions.map((role) => <FilterChip key={role} active={d.filters.roleFilter === role} onClick={() => d.setFilter.setRoleFilter(role)}>{role}</FilterChip>)}
                </div>
            ) : null}
            <p className="mt-3 text-xs text-muted-foreground">{t('dashboard.showing', { visible: d.visible.length, total: d.scoped.length })}</p>
            {d.filters.view === 'list' ? <BooksList books={d.visible} me={me} loading={d.isLoading} /> : <BooksTimeline books={d.visible} loading={d.isLoading} />}
        </div>
    );
}

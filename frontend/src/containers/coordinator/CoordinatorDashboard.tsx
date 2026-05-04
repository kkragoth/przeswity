import { useNavigate } from '@tanstack/react-router';
import { CalendarClock, CircleAlert, Filter, MessageSquareText, Plus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SessionUser } from '@/auth/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BooksList } from '@/containers/coordinator/components/BooksList';
import { BooksTimeline } from '@/containers/coordinator/components/BooksTimeline';
import { FilterChip } from '@/containers/coordinator/components/FilterChip';
import { FilterChipGroup } from '@/containers/coordinator/components/FilterChipGroup';
import { KpiCard } from '@/containers/coordinator/components/KpiCard';
import { DashboardView, QuickFilter } from '@/containers/coordinator/hooks/booksDashboardSelectors';
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
                <KpiCard label={t('dashboard.kpi.attention')} value={d.kpis.attention} icon={CircleAlert} tone="danger" onClick={() => d.setFilter.setQuickFilter(QuickFilter.Attention)} />
                <KpiCard label={t('dashboard.kpi.recent')} value={d.kpis.recent} icon={MessageSquareText} tone="primary" onClick={() => d.setFilter.setQuickFilter(QuickFilter.Recent)} />
                <KpiCard label={t('dashboard.kpi.activeWeek')} value={d.kpis.activeWeek} icon={CalendarClock} onClick={() => d.setFilter.setQuickFilter(QuickFilter.All)} />
                <KpiCard label={t('dashboard.kpi.unassigned')} value={d.kpis.unassigned} icon={Users} onClick={() => d.setFilter.setQuickFilter(QuickFilter.Unassigned)} />
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
                <FilterChipGroup
                    options={[
                        { label: t('books.filterMine'), value: true },
                        { label: t('books.filterAll'), value: false },
                    ]}
                    activeValue={d.filters.showOnlyMine}
                    onChange={d.setFilter.setShowOnlyMine}
                />
                <div className="mx-1 h-5 w-px bg-border" />
                <FilterChipGroup
                    options={[
                        { label: t('dashboard.view.list'), value: DashboardView.List },
                        { label: t('dashboard.view.timeline'), value: DashboardView.Timeline },
                    ]}
                    activeValue={d.filters.view}
                    onChange={d.setFilter.setView}
                />
                <div className="mx-1 h-5 w-px bg-border" />
                <FilterChipGroup
                    options={[
                        { label: t('dashboard.quick.all'), value: QuickFilter.All },
                        { label: t('dashboard.quick.attention'), value: QuickFilter.Attention },
                        { label: t('dashboard.quick.recent'), value: QuickFilter.Recent },
                        { label: t('dashboard.quick.unassigned'), value: QuickFilter.Unassigned },
                    ]}
                    activeValue={d.filters.quickFilter}
                    onChange={d.setFilter.setQuickFilter}
                />
            </div>
            {d.roleOptions.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-1 text-xs text-muted-foreground"><Filter className="h-3 w-3" />{t('dashboard.role')}</Badge>
                    <FilterChip active={d.filters.roleFilter === 'all'} onClick={() => d.setFilter.setRoleFilter('all')}>{t('dashboard.quick.all')}</FilterChip>
                    {d.roleOptions.map((role) => <FilterChip key={role} active={d.filters.roleFilter === role} onClick={() => d.setFilter.setRoleFilter(role)}>{role}</FilterChip>)}
                </div>
            ) : null}
            <p className="mt-3 text-xs text-muted-foreground">{t('dashboard.showing', { visible: d.visible.length, total: d.scoped.length })}</p>
            {d.filters.view === DashboardView.List ? <BooksList books={d.visible} loading={d.isLoading} /> : <BooksTimeline books={d.visible} loading={d.isLoading} />}
        </div>
    );
}

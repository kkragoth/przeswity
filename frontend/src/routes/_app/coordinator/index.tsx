import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, CircleAlert, Clock3, Filter, MessageSquareText, Plus, UserCheck, Users } from 'lucide-react';
import type { SessionUser } from '@/auth/types';
import { bookPatchProgress, bookPatchStage, booksList } from '@/api/generated/services.gen';
import type { BookSummary, Book } from '@/api/generated/types.gen';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/_app/coordinator/')({
    beforeLoad: ({ context }) => {
        const user = context.session?.user as SessionUser | undefined;
        if (user?.systemRole !== 'admin' && user?.systemRole !== 'project_manager') throw redirect({ to: '/' });
    },
    component: CoordinatorHome,
});

function CoordinatorHome() {
    const { t } = useTranslation('coordinator');
    const { session } = Route.useRouteContext();
    const me = session.user as SessionUser;
    const navigate = useNavigate();
    const [showOnlyMine, setShowOnlyMine] = useState(true);
    const [view, setView] = useState<'list' | 'timeline'>('list');
    const [quickFilter, setQuickFilter] = useState<'all' | 'attention' | 'recent' | 'unassigned'>('all');
    const [roleFilter, setRoleFilter] = useState<'all' | string>('all');

    const { data: books = [], isLoading } = useQuery({
        queryKey: ['books'],
        queryFn: async () => (await booksList()).data ?? [],
    });

    const scoped = showOnlyMine ? books.filter((b) => b.createdById === me.id) : books;
    const visible = scoped.filter((b) => {
        if (quickFilter === 'attention' && !isAttentionBook(b)) return false;
        if (quickFilter === 'recent' && !isRecentBook(b)) return false;
        if (quickFilter === 'unassigned' && b.assigneeCount > 0) return false;
        if (roleFilter !== 'all' && !b.myRoles.includes(roleFilter)) return false;
        return true;
    });

    const kpis = {
        attention: scoped.filter((b) => isAttentionBook(b)).length,
        recent: scoped.filter((b) => isRecentBook(b)).length,
        unassigned: scoped.filter((b) => b.assigneeCount === 0).length,
        activeWeek: scoped.filter((b) => isActiveWithinDays(b, 7)).length,
    };

    const roleOptions = Array.from(new Set(scoped.flatMap((b) => b.myRoles))).sort();

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground">
                        {t('greeting', { name: me.name ?? me.email })} · {t('dashboard.activeProjects', { count: scoped.length })}
                    </p>
                </div>
                <Button className="gap-2" onClick={() => navigate({ to: '/coordinator/books/new' })}>
                    <Plus className="h-4 w-4" />
                    {t('newBook')}
                </Button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label={t('dashboard.kpi.attention')} value={kpis.attention} icon={CircleAlert} tone="danger" onClick={() => setQuickFilter('attention')} />
                <KpiCard label={t('dashboard.kpi.recent')} value={kpis.recent} icon={MessageSquareText} tone="primary" onClick={() => setQuickFilter('recent')} />
                <KpiCard label={t('dashboard.kpi.activeWeek')} value={kpis.activeWeek} icon={CalendarClock} onClick={() => setQuickFilter('all')} />
                <KpiCard label={t('dashboard.kpi.unassigned')} value={kpis.unassigned} icon={Users} onClick={() => setQuickFilter('unassigned')} />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
                <FilterChip active={showOnlyMine} onClick={() => setShowOnlyMine(true)}>
                    {t('books.filterMine')}
                </FilterChip>
                <FilterChip active={!showOnlyMine} onClick={() => setShowOnlyMine(false)}>
                    {t('books.filterAll')}
                </FilterChip>
                <div className="mx-1 h-5 w-px bg-border" />
                <FilterChip active={view === 'list'} onClick={() => setView('list')}>
                    {t('dashboard.view.list')}
                </FilterChip>
                <FilterChip active={view === 'timeline'} onClick={() => setView('timeline')}>
                    {t('dashboard.view.timeline')}
                </FilterChip>
                <div className="mx-1 h-5 w-px bg-border" />
                <FilterChip active={quickFilter === 'all'} onClick={() => setQuickFilter('all')}>
                    {t('dashboard.quick.all')}
                </FilterChip>
                <FilterChip active={quickFilter === 'attention'} onClick={() => setQuickFilter('attention')}>
                    {t('dashboard.quick.attention')}
                </FilterChip>
                <FilterChip active={quickFilter === 'recent'} onClick={() => setQuickFilter('recent')}>
                    {t('dashboard.quick.recent')}
                </FilterChip>
                <FilterChip active={quickFilter === 'unassigned'} onClick={() => setQuickFilter('unassigned')}>
                    {t('dashboard.quick.unassigned')}
                </FilterChip>
            </div>

            {roleOptions.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                        <Filter className="h-3 w-3" />
                        {t('dashboard.role')}
                    </Badge>
                    <FilterChip active={roleFilter === 'all'} onClick={() => setRoleFilter('all')}>
                        {t('dashboard.quick.all')}
                    </FilterChip>
                    {roleOptions.map((role) => (
                        <FilterChip key={role} active={roleFilter === role} onClick={() => setRoleFilter(role)}>
                            {role}
                        </FilterChip>
                    ))}
                </div>
            )}

            <p className="mt-3 text-xs text-muted-foreground">
                {t('dashboard.showing', { visible: visible.length, total: scoped.length })}
            </p>

            {view === 'list' ? (
                <BooksList books={visible} loading={isLoading} />
            ) : (
                <BooksTimeline books={visible} loading={isLoading} />
            )}
        </div>
    );
}

function KpiCard({
    label,
    value,
    icon: Icon,
    tone = 'default',
    onClick,
}: {
    label: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    tone?: 'default' | 'primary' | 'danger';
    onClick: () => void;
}) {
    const toneClass = tone === 'danger' ? 'text-destructive' : tone === 'primary' ? 'text-primary' : 'text-foreground';
    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/40"
        >
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
        </button>
    );
}

function BooksList({ books, loading }: { books: ReadonlyArray<BookSummary>; loading: boolean }) {
    const { t } = useTranslation('coordinator');
    const { t: tc } = useTranslation('common');
    const qc = useQueryClient();
    const [draftStage, setDraftStage] = useState<Record<string, Book['stage']>>({});
    const [draftProgress, setDraftProgress] = useState<Record<string, number>>({});
    const stageMutation = useMutation({
        mutationFn: ({ id, stage }: { id: string; stage: Book['stage'] }) =>
            bookPatchStage({ path: { id }, body: { stage } }),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ['books'] });
        },
    });
    const progressMutation = useMutation({
        mutationFn: ({ id, progress }: { id: string; progress: number }) =>
            bookPatchProgress({ path: { id }, body: { progress, mode: 'manual' } }),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ['books'] });
        },
    });
    if (loading) return <p className="mt-6 text-sm text-muted-foreground">{tc('states.loading')}</p>;
    if (books.length === 0) {
        return (
            <EmptyState
                title={t('empty.title')}
                body={t('empty.body')}
                cta={
                    <Link to="/coordinator/books/new">
                        <Button>{t('empty.cta')}</Button>
                    </Link>
                }
            />
        );
    }
    return (
        <div className="mt-4 space-y-3">
            {books.map((book) => {
                const nextStages = allowedNextStages(book.stage);
                const selectedStage = draftStage[book.id] ?? book.stage;
                const selectedProgress = draftProgress[book.id] ?? book.progress;
                const stageChanged = selectedStage !== book.stage;
                const progressChanged = selectedProgress !== book.progress;
                return (
                    <article key={book.id} className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/35">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Link to="/books/$bookId" params={{ bookId: book.id }} className="truncate font-semibold hover:underline">
                                        {book.title}
                                    </Link>
                                    <StatusBadge book={book} />
                                    <Badge variant="outline">{tc(`books.stages.${book.stage}`)}</Badge>
                                    <Badge variant="outline">{book.progress}%</Badge>
                                </div>
                                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                    {book.description || tc('books.card.noDescription')}
                                </p>
                            </div>
                            <Link to="/books/$bookId" params={{ bookId: book.id }}>
                                <Button size="sm" variant="outline">{tc('books.card.open')}</Button>
                            </Link>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant="secondary" className="gap-1"><UserCheck className="h-3 w-3" />{book.assigneeCount}</Badge>
                            <Badge variant="outline" className="gap-1"><Clock3 className="h-3 w-3" />{formatLastActivity(book.lastEditAt ?? book.stageChangedAt, t)}</Badge>
                            {book.myRoles.map((role) => (
                                <Badge key={role} variant="outline">{role}</Badge>
                            ))}
                        </div>
                        <div className="mt-3 grid gap-2 rounded-md border bg-background/60 p-3 md:grid-cols-[1fr,140px,1fr,96px]">
                            <select
                                value={selectedStage}
                                onChange={(e) => setDraftStage((prev) => ({ ...prev, [book.id]: e.target.value as Book['stage'] }))}
                                className="h-9 rounded-md border bg-background px-2 text-sm"
                            >
                                <option value={book.stage}>{tc(`books.stages.${book.stage}`)}</option>
                                {nextStages.map((s) => (
                                    <option key={s} value={s}>{tc(`books.stages.${s}`)}</option>
                                ))}
                            </select>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={!stageChanged || stageMutation.isPending}
                                onClick={() => stageMutation.mutate({ id: book.id, stage: selectedStage })}
                            >
                                {tc('actions.save')}
                            </Button>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={selectedProgress}
                                onChange={(e) => setDraftProgress((prev) => ({ ...prev, [book.id]: Number(e.target.value) }))}
                                className="h-9 rounded-md border bg-background px-2 text-sm"
                            />
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={!progressChanged || selectedProgress < 0 || selectedProgress > 100 || progressMutation.isPending}
                                onClick={() => progressMutation.mutate({ id: book.id, progress: selectedProgress })}
                            >
                                {tc('actions.save')}
                            </Button>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}

function BooksTimeline({ books, loading }: { books: ReadonlyArray<BookSummary>; loading: boolean }) {
    const { t } = useTranslation('coordinator');
    const { t: tc } = useTranslation('common');
    if (loading) return <p className="mt-6 text-sm text-muted-foreground">{tc('states.loading')}</p>;
    if (books.length === 0) return <p className="mt-6 text-sm text-muted-foreground">{t('dashboard.noTimeline')}</p>;
    return (
        <div className="mt-4 space-y-2 rounded-lg border bg-card p-4">
            {books.map((book) => {
                const days = daysSince(book.lastEditAt ?? book.stageChangedAt);
                const ratio = Math.max(0, Math.min(100, 100 - Math.round((days / 21) * 100)));
                return (
                    <Link key={book.id} to="/books/$bookId" params={{ bookId: book.id }} className="block rounded-md p-2 transition-colors hover:bg-muted/40">
                        <div className="flex items-center gap-3">
                            <p className="w-52 shrink-0 truncate text-sm font-medium">{book.title}</p>
                            <div className="h-2 flex-1 rounded-full bg-muted">
                                <div className={`h-2 rounded-full ${isAttentionBook(book) ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${ratio}%` }} />
                            </div>
                            <p className="w-32 shrink-0 text-right text-xs text-muted-foreground">{formatLastActivity(book.lastEditAt ?? book.stageChangedAt, t)}</p>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}

function StatusBadge({ book }: { book: BookSummary }) {
    const { t } = useTranslation('coordinator');
    if (book.assigneeCount === 0) return <Badge variant="destructive">{t('dashboard.status.unassigned')}</Badge>;
    if (isAttentionBook(book)) return <Badge variant="destructive">{t('dashboard.status.attention')}</Badge>;
    if (isRecentBook(book)) return <Badge className="bg-primary text-primary-foreground">{t('dashboard.status.recent')}</Badge>;
    return <Badge variant="secondary">{t('dashboard.status.stable')}</Badge>;
}

function daysSince(activityAt: string | null): number {
    if (!activityAt) return 999;
    const delta = Date.now() - new Date(activityAt).getTime();
    return Math.max(0, Math.floor(delta / (1000 * 60 * 60 * 24)));
}

function isActiveWithinDays(book: BookSummary, days: number) {
    return daysSince(book.lastEditAt ?? book.stageChangedAt) <= days;
}

function isAttentionBook(book: BookSummary) {
    return book.assigneeCount === 0 || daysSince(book.lastEditAt ?? book.stageChangedAt) > 14;
}

function isRecentBook(book: BookSummary) {
    return daysSince(book.lastEditAt ?? book.stageChangedAt) <= 2;
}

function formatLastActivity(activityAt: string | null, t: ReturnType<typeof useTranslation>['t']) {
    if (!activityAt) return t('dashboard.activity.none');
    const days = daysSince(activityAt);
    if (days === 0) return t('dashboard.activity.today');
    if (days === 1) return t('dashboard.activity.yesterday');
    return t('dashboard.activity.daysAgo', { count: days });
}

function allowedNextStages(stage: Book['stage']): Book['stage'][] {
    const map: Record<Book['stage'], Book['stage'][]> = {
        translation: ['editing'],
        editing: ['authorization', 'proofreading'],
        authorization: ['proofreading', 'editing'],
        proofreading: ['applying_changes', 'editing'],
        applying_changes: ['typesetting', 'proofreading'],
        typesetting: ['post_typeset_proof'],
        post_typeset_proof: ['finalization', 'applying_changes'],
        finalization: [],
    };
    return map[stage];
}

function FilterChip({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full border px-3 py-1 transition-colors ${
                active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
            }`}
        >
            {children}
        </button>
    );
}

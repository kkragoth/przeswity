import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen, ChevronRight, Clock3, Plus, UserCheck } from 'lucide-react';
import type { SessionUser } from '@/auth/types';
import { booksList } from '@/api/generated/services.gen';
import type { BookSummary } from '@/api/generated/types.gen';
import { Button } from '@/components/ui/button';
import { RoleBadge } from '@/components/RoleBadge';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/_app/books/')({
    component: BooksPage,
});

type StageKey =
    | 'translation'
    | 'editing'
    | 'authorization'
    | 'proofreading'
    | 'applying_changes'
    | 'typesetting'
    | 'post_typeset_proof'
    | 'finalization';

const STAGES: StageKey[] = [
    'translation',
    'editing',
    'authorization',
    'proofreading',
    'applying_changes',
    'typesetting',
    'post_typeset_proof',
    'finalization',
];

function BooksPage() {
    const { t } = useTranslation('common');
    const { session } = Route.useRouteContext();
    const user = session.user as SessionUser;
    const canCreate = !!user.isAdmin || !!user.isCoordinator;

    const { data: books = [], isLoading } = useQuery({
        queryKey: ['books'],
        queryFn: async () => (await booksList()).data ?? [],
    });

    return (
        <div className="min-h-dvh flex flex-col bg-background">
            <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
                <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">
                    <Link to="/books" className="inline-flex text-primary" aria-label="Prześwity">
                        <BookOpen className="h-5 w-5" />
                    </Link>
                    <nav className="flex min-w-0 items-center gap-1 text-sm">
                        <span className="text-muted-foreground">{t('nav.books')}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate font-serif text-base font-medium text-foreground">{t('books.title')}</span>
                    </nav>
                    <div className="flex-1" />
                    {canCreate && (
                        <Link to="/coordinator/books/new">
                            <Button size="sm" className="gap-2">
                                <Plus className="h-4 w-4" />
                                {t('books.newBook')}
                            </Button>
                        </Link>
                    )}
                </div>
            </header>

            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
                {isLoading ? (
                    <p className="text-sm text-muted-foreground">{t('states.loading')}</p>
                ) : books.length === 0 ? (
                    <EmptyState
                        title={t('books.empty.title')}
                        body={t('books.empty.body')}
                        cta={
                            canCreate ? (
                                <Link to="/coordinator/books/new">
                                    <Button>{t('books.newBook')}</Button>
                                </Link>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="space-y-3">
                        {books.map((book) => (
                            <BookRow key={book.id} book={book} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

function BookRow({ book }: { book: BookSummary }) {
    const { t } = useTranslation('common');
    const stage = book.stage;
    const progress = book.progress;
    const stageIndex = Math.max(0, STAGES.indexOf(stage)) + 1;
    const staleDays = daysSince(book.lastEditAt ?? book.stageChangedAt);
    const status = staleDays > 14 ? 'danger' : staleDays <= 2 ? 'active' : 'normal';

    return (
        <Link to="/books/$bookId" params={{ bookId: book.id }} className="block">
            <article className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate font-serif text-lg font-semibold">{book.title}</h2>
                            <StatusBadge status={status} />
                            <Badge variant="outline">{t(`books.stages.${stage}`)}</Badge>
                        </div>
                        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                            {book.description || t('books.card.noDescription')}
                        </p>
                    </div>
                    <Button size="sm" variant="outline">{t('books.card.open')}</Button>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-[1.5fr,1fr,1fr]">
                    <div>
                        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{t('books.card.stageProgress', { current: stageIndex, total: STAGES.length })}</span>
                            <span className="font-medium text-foreground">{progress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                            <div
                                className={`h-2 rounded-full ${status === 'danger' ? 'bg-destructive' : 'bg-primary'}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <UserCheck className="h-3.5 w-3.5" />
                        {t('books.card.assignees', { count: book.assigneeCount })}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatActivity(book.lastEditAt ?? book.stageChangedAt, t)}
                    </div>
                </div>

                {book.myRoles.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {book.myRoles.map((r) => (
                            <RoleBadge key={r} role={r} />
                        ))}
                    </div>
                )}
            </article>
        </Link>
    );
}

function StatusBadge({ status }: { status: 'danger' | 'active' | 'normal' }) {
    const { t } = useTranslation('common');
    if (status === 'danger') return <Badge variant="destructive">{t('books.status.needsAttention')}</Badge>;
    if (status === 'active') return <Badge className="bg-primary text-primary-foreground">{t('books.status.active')}</Badge>;
    return <Badge variant="secondary">{t('books.status.inProgress')}</Badge>;
}

function daysSince(iso: string | null): number {
    if (!iso) return 999;
    const delta = Date.now() - new Date(iso).getTime();
    return Math.max(0, Math.floor(delta / (1000 * 60 * 60 * 24)));
}

function formatActivity(iso: string | null, t: ReturnType<typeof useTranslation>['t']) {
    if (!iso) return t('books.card.noActivity');
    const d = daysSince(iso);
    if (d === 0) return t('books.card.activityToday');
    if (d === 1) return t('books.card.activityYesterday');
    return t('books.card.activityDaysAgo', { count: d });
}

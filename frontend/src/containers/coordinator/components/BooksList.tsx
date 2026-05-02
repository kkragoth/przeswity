import { Link } from '@tanstack/react-router';
import { Clock3, UserCheck } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { BookSummary } from '@/api/generated/types.gen';
import type { SessionUser } from '@/auth/types';
import { EmptyState } from '@/components/feedback/EmptyState';
import { RoleBadge } from '@/components/badges/RoleBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatActivity } from '@/lib/dates';
import { allowedNextStages } from '@/lib/stage';
import { CoordinatorStatusBadge } from '@/containers/coordinator/components/CoordinatorStatusBadge';
import { useBookActions } from '@/hooks/api/useBookActions';

export function BooksList({ books, me: _me, loading }: { books: ReadonlyArray<BookSummary>; me: SessionUser; loading: boolean }) {
    const { t } = useTranslation('coordinator');
    const { t: tc } = useTranslation('common');
    const actions = useBookActions(books.map((b) => ({ id: b.id, stage: b.stage, progress: b.progress })));
    if (loading) return <p className="mt-6 text-sm text-muted-foreground">{tc('states.loading')}</p>;
    if (books.length === 0) return <EmptyState title={t('empty.title')} body={t('empty.body')} cta={<Link to="/coordinator/books/new"><Button>{t('empty.cta')}</Button></Link>} />;

    return <div className="mt-4 space-y-3">{books.map((book) => <BooksListRow key={book.id} book={book} actions={actions} />)}</div>;
}

const BooksListRow = memo(function BooksListRow({
    book,
    actions,
}: {
    book: BookSummary;
    actions: ReturnType<typeof useBookActions>;
}) {
    const { t: tc } = useTranslation('common');
    const nextStages = allowedNextStages(book.stage);
    const selectedStage = actions.stageDraft[book.id] ?? book.stage;
    const selectedProgress = actions.progressDraft[book.id] ?? book.progress;

    return (
        <article className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/35">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Link to="/books/$bookId" params={{ bookId: book.id }} className="truncate font-semibold hover:underline">{book.title}</Link>
                        <CoordinatorStatusBadge book={book} />
                        <Badge variant="outline">{tc(`books.stages.${book.stage}`)}</Badge><Badge variant="outline">{book.progress}%</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{book.description || tc('books.card.noDescription')}</p>
                </div>
                <Link to="/books/$bookId" params={{ bookId: book.id }}><Button size="sm" variant="outline">{tc('books.card.open')}</Button></Link>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary" className="gap-1"><UserCheck className="h-3 w-3" />{book.assigneeCount}</Badge>
                <Badge variant="outline" className="gap-1"><Clock3 className="h-3 w-3" />{formatActivity(book.lastEditAt ?? book.stageChangedAt, tc)}</Badge>
                {book.myRoles.map((role) => <RoleBadge key={role} role={role} />)}
            </div>
            <div className="mt-3 grid gap-2 rounded-md border bg-background/60 p-3 md:grid-cols-[1fr,140px,1fr,96px]">
                <select value={selectedStage} onChange={(e) => actions.setStageDraft((p) => ({ ...p, [book.id]: e.target.value as typeof book.stage }))} className="h-9 rounded-md border bg-background px-2 text-sm">
                    <option value={book.stage}>{tc(`books.stages.${book.stage}`)}</option>
                    {nextStages.map((s) => <option key={s} value={s}>{tc(`books.stages.${s}`)}</option>)}
                </select>
                <Button size="sm" variant="outline" disabled={selectedStage === book.stage} onClick={() => void actions.commitStage(book.id)}>{tc('actions.save')}</Button>
                <input type="number" min={0} max={100} value={selectedProgress} onChange={(e) => actions.setProgressDraft((p) => ({ ...p, [book.id]: Number(e.target.value) }))} className="h-9 rounded-md border bg-background px-2 text-sm" />
                <Button size="sm" variant="outline" disabled={selectedProgress === book.progress || selectedProgress < 0 || selectedProgress > 100} onClick={() => void actions.commitProgress(book.id)}>{tc('actions.save')}</Button>
            </div>
        </article>
    );
}, (prev, next) => {
    if (prev.book !== next.book) return false;
    if (prev.actions.stageDraft[prev.book.id] !== next.actions.stageDraft[next.book.id]) return false;
    if (prev.actions.progressDraft[prev.book.id] !== next.actions.progressDraft[next.book.id]) return false;
    return true;
});

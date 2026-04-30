import { Link } from '@tanstack/react-router';
import { Clock3, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BookSummary } from '@/api/generated/types.gen';
import type { SessionUser } from '@/auth/types';
import { RoleBadge } from '@/components/badges/RoleBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatActivity } from '@/lib/dates';
import { bookAttention, BookAttention } from '@/lib/status';
import { BookStatusBadge } from '@/containers/books/components/BookStatusBadge';

const STAGES = [
    'translation',
    'editing',
    'authorization',
    'proofreading',
    'applying_changes',
    'typesetting',
    'post_typeset_proof',
    'finalization',
] as const;

export function BookRow({ book, me: _me }: { book: BookSummary; me: SessionUser }) {
    const { t } = useTranslation('common');
    const stageIndex = Math.max(0, STAGES.indexOf(book.stage)) + 1;
    const status = bookAttention(book);

    return (
        <Link to="/books/$bookId" params={{ bookId: book.id }} className="block">
            <article className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate font-serif text-lg font-semibold">{book.title}</h2>
                            <BookStatusBadge book={book} />
                            <Badge variant="outline">{t(`books.stages.${book.stage}`)}</Badge>
                        </div>
                        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{book.description || t('books.card.noDescription')}</p>
                    </div>
                    <Button size="sm" variant="outline">{t('books.card.open')}</Button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-[1.5fr,1fr,1fr]">
                    <div>
                        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{t('books.card.stageProgress', { current: stageIndex, total: STAGES.length })}</span>
                            <span className="font-medium text-foreground">{book.progress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                            <div className={`h-2 rounded-full ${status === BookAttention.Stale ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${book.progress}%` }} />
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
                {book.myRoles.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {book.myRoles.map((role) => (
                            <RoleBadge key={role} role={role} />
                        ))}
                    </div>
                ) : null}
            </article>
        </Link>
    );
}

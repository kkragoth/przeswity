import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { SessionUser } from '@/auth/types';
import { booksList } from '@/api/generated/services.gen';
import type { BookSummary } from '@/api/generated/types.gen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RoleBadge } from '@/components/RoleBadge';
import { EmptyState } from '@/components/EmptyState';

export const Route = createFileRoute('/_app/books/')({
    component: BooksPage,
});

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
        <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">{t('books.title')}</h1>
                {canCreate && (
                    <Link to="/coordinator/books/new">
                        <Button>{t('books.newBook')}</Button>
                    </Link>
                )}
            </div>
            {isLoading ? (
                <p className="mt-6 text-sm text-stone-500">{t('states.loading')}</p>
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
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {books.map((b) => (
                        <BookCard key={b.id} book={b} />
                    ))}
                </div>
            )}
        </div>
    );
}

function BookCard({ book }: { book: BookSummary }) {
    const { t } = useTranslation('common');
    return (
        <Link to="/books/$bookId" params={{ bookId: book.id }} className="block">
            <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                    <CardTitle className="text-lg">{book.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="line-clamp-2 text-sm text-stone-600">
                        {book.description || t('books.card.noDescription')}
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {book.myRoles.map((r) => (
                            <RoleBadge key={r} role={r} />
                        ))}
                    </div>
                    <p className="text-xs text-stone-500">
                        {t('books.card.assignees', { count: book.assigneeCount })}
                    </p>
                </CardContent>
            </Card>
        </Link>
    );
}

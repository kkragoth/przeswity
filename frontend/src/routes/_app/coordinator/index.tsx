import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SessionUser } from '@/auth/types';
import { booksList } from '@/api/generated/services.gen';
import type { BookSummary } from '@/api/generated/types.gen';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';

export const Route = createFileRoute('/_app/coordinator/')({
    beforeLoad: ({ context }) => {
        const user = context.session?.user as SessionUser | undefined;
        if (!user?.isAdmin && !user?.isCoordinator) throw redirect({ to: '/' });
    },
    component: CoordinatorHome,
});

function CoordinatorHome() {
    const { t } = useTranslation('coordinator');
    const { session } = Route.useRouteContext();
    const me = session.user as SessionUser;
    const navigate = useNavigate();
    const [showOnlyMine, setShowOnlyMine] = useState(true);

    const { data: books = [], isLoading } = useQuery({
        queryKey: ['books'],
        queryFn: async () => (await booksList()).data ?? [],
    });

    const visible = showOnlyMine ? books.filter((b) => b.createdById === me.id) : books;

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">{t('title')}</h1>
                    <p className="text-stone-600">{t('greeting', { name: me.name ?? me.email })}</p>
                </div>
                <Button onClick={() => navigate({ to: '/coordinator/books/new' })}>
                    {t('newBook')}
                </Button>
            </div>

            <div className="mt-6 flex gap-2 text-sm">
                <FilterChip active={showOnlyMine} onClick={() => setShowOnlyMine(true)}>
                    {t('books.filterMine')}
                </FilterChip>
                <FilterChip active={!showOnlyMine} onClick={() => setShowOnlyMine(false)}>
                    {t('books.filterAll')}
                </FilterChip>
            </div>

            <BooksSection books={visible} loading={isLoading} />
        </div>
    );
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
                active ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 hover:bg-stone-200'
            }`}
        >
            {children}
        </button>
    );
}

function BooksSection({ books, loading }: { books: ReadonlyArray<BookSummary>; loading: boolean }) {
    const { t } = useTranslation('coordinator');
    const { t: tc } = useTranslation('common');
    if (loading) return <p className="mt-6 text-sm text-stone-500">{tc('states.loading')}</p>;
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
        <table className="mt-6 w-full text-sm">
            <thead className="border-b text-left text-stone-600">
                <tr>
                    <th className="py-2 font-medium">{t('books.table.title')}</th>
                    <th className="font-medium">{t('books.table.assignees')}</th>
                    <th className="font-medium">{t('books.table.lastActivity')}</th>
                    <th className="font-medium">{t('books.table.actions')}</th>
                </tr>
            </thead>
            <tbody>
                {books.map((b) => (
                    <tr key={b.id} className="border-b">
                        <td className="py-2">
                            <Link to="/books/$bookId" params={{ bookId: b.id }} className="font-medium hover:underline">
                                {b.title}
                            </Link>
                        </td>
                        <td className="text-stone-600">{b.assigneeCount}</td>
                        <td className="text-stone-600">{b.lastEditAt ?? '—'}</td>
                        <td>
                            <Link to="/books/$bookId" params={{ bookId: b.id }}>
                                <Button size="sm" variant="outline">{tc('books.card.open')}</Button>
                            </Link>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

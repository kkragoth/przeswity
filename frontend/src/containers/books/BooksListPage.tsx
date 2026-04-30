import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { booksListOptions } from '@/api/generated/@tanstack/react-query.gen';
import type { SessionUser } from '@/auth/types';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { BookRow } from '@/containers/books/components/BookRow';

export function BooksListPage({ user }: { user: SessionUser }) {
    const { t } = useTranslation('common');
    const canCreate = user.systemRole === 'admin' || user.systemRole === 'project_manager';
    const { data: books = [], isLoading } = useQuery({
        ...booksListOptions(),
    });

    return (
        <PageLayout
            title={t('books.title')}
            actions={canCreate ? <Link to="/coordinator/books/new"><Button size="sm" className="gap-2"><Plus className="h-4 w-4" />{t('books.newBook')}</Button></Link> : undefined}
        >
            {isLoading ? (
                <p className="text-sm text-muted-foreground">{t('states.loading')}</p>
            ) : books.length === 0 ? (
                <EmptyState
                    title={t('books.empty.title')}
                    body={t('books.empty.body')}
                    cta={canCreate ? <Link to="/coordinator/books/new"><Button>{t('books.newBook')}</Button></Link> : undefined}
                />
            ) : (
                <div className="space-y-3">{books.map((book) => <BookRow key={book.id} book={book} me={user} />)}</div>
            )}
        </PageLayout>
    );
}

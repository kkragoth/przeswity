import '@/editor/styles.css';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { EditorSkeleton } from '@/containers/editor/components/EditorSkeleton';

const BookEditorPage = lazy(async () => import('@/containers/books/BookEditorPage').then((m) => ({ default: m.BookEditorPage })));

export const Route = createFileRoute('/_app/books/$bookId')({
    component: BookDetailRoute,
});

function BookDetailRoute() {
    const { bookId } = Route.useParams();
    return (
        <Suspense fallback={<EditorSkeleton />}>
            <BookEditorPage bookId={bookId} />
        </Suspense>
    );
}

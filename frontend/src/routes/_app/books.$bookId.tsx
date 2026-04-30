import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const BookEditorPage = lazy(async () => import('@/containers/books/BookEditorPage').then((m) => ({ default: m.BookEditorPage })));

function EditorSkeleton() {
    return (
        <div className="p-8 text-sm text-stone-500" role="status" aria-live="polite">
            Loading editor...
        </div>
    );
}

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

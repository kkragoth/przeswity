import { createFileRoute } from '@tanstack/react-router';
import type { SessionUser } from '@/auth/types';
import { BooksListPage } from '@/containers/books/BooksListPage';

export const Route = createFileRoute('/_app/books/')({
    component: BooksRoute,
});

function BooksRoute() {
    const { session } = Route.useRouteContext();
    return <BooksListPage user={session.user as SessionUser} />;
}

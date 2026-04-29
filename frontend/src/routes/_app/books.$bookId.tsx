import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { bookGet, bookAssignmentsList } from '@/api/generated/services.gen';
import { authClient } from '@/auth/client';
import { EditorHost } from '@/editor/EditorHost';

export const Route = createFileRoute('/_app/books/$bookId')({
    component: BookDetail,
});

function BookDetail() {
    const { t } = useTranslation('common');
    const { bookId } = Route.useParams();
    const session = authClient.useSession();
    const u = session.data?.user as any;

    const bookQ = useQuery({
        queryKey: ['book', bookId],
        queryFn: async () => (await bookGet({ path: { id: bookId } })).data,
    });

    const assignmentsQ = useQuery({
        queryKey: ['book-assignments', bookId],
        queryFn: async () => (await bookAssignmentsList({ path: { bookId } })).data ?? [],
    });

    if (!u) return null;
    if (bookQ.isLoading || assignmentsQ.isLoading) {
        return <div className="p-8 text-sm text-stone-500">{t('states.loading')}</div>;
    }
    if (!bookQ.data) {
        return <div className="p-8 text-sm text-stone-500">{t('bookDetail.notFound')}</div>;
    }

    const assignments = Array.isArray(assignmentsQ.data) ? assignmentsQ.data : [];
    const myRoles = assignments.filter((a: any) => a.userId === u.id).map((a: any) => a.role);
    const isOwner = bookQ.data.createdById === u.id;
    const role = (myRoles[0] ?? 'editor') as string;

    return (
        <EditorHost
            bookId={bookId}
            user={{ id: u.id, name: u.name, color: u.color ?? '#7c3aed', role }}
            bookTitle={bookQ.data.title}
        />
    );
}

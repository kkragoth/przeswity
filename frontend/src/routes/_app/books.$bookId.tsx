import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { bookGet, bookAssignmentsList } from '@/api/generated/services.gen';
import { authClient } from '@/auth/client';
import { EditorHost } from '@/editor/EditorHost';

export const Route = createFileRoute('/_app/books/$bookId')({
    component: BookDetail,
});

function BookDetail() {
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
    if (bookQ.isLoading) return <div className="p-8">Ładowanie…</div>;
    if (!bookQ.data) return <div className="p-8">Nie znaleziono książki.</div>;

    const myRoles = (assignmentsQ.data ?? []).filter((a: any) => a.userId === u.id).map((a: any) => a.role);
    const isOwner = bookQ.data.createdById === u.id;
    const role = (myRoles[0] ?? (isOwner || u.isAdmin ? 'editor' : 'editor')) as string;

    return (
        <EditorHost
            bookId={bookId}
            user={{ id: u.id, name: u.name, color: u.color ?? '#7c3aed', role }}
            bookTitle={bookQ.data.title}
        />
    );
}

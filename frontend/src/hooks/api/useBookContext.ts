import { useQuery } from '@tanstack/react-query';
import { authClient } from '@/auth/client';
import { bookAssignmentsList, bookGet } from '@/api/generated/services.gen';
import type { AssignmentWithUser, Book, role } from '@/api/generated/types.gen';
import type { SessionUser } from '@/auth/types';

export function deriveMyRoles(assignments: AssignmentWithUser[], userId: string): role[] {
    return assignments.filter((a) => a.userId === userId).map((a) => a.role);
}

export function useBookContext(bookId: string): {
    book: Book | null;
    me: SessionUser | null;
    assignments: AssignmentWithUser[];
    myRoles: role[];
    primaryRole: role | null;
    isLoading: boolean;
} {
    const session = authClient.useSession();
    const me = (session.data?.user as SessionUser | undefined) ?? null;

    const bookQuery = useQuery({
        queryKey: ['book', bookId],
        queryFn: async () => (await bookGet({ path: { id: bookId } })).data ?? null,
    });
    const assignmentsQuery = useQuery({
        queryKey: ['book-assignments', bookId],
        queryFn: async () => (await bookAssignmentsList({ path: { bookId } })).data ?? [],
    });

    const assignments = Array.isArray(assignmentsQuery.data) ? assignmentsQuery.data : [];
    const myRoles = me ? deriveMyRoles(assignments, me.id) : [];

    return {
        book: bookQuery.data ?? null,
        me,
        assignments,
        myRoles,
        primaryRole: myRoles[0] ?? null,
        isLoading: session.isPending || bookQuery.isLoading || assignmentsQuery.isLoading,
    };
}

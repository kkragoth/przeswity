import { useQueryClient } from '@tanstack/react-query';
import { bookAssignmentsListQueryKey } from '@/api/generated/@tanstack/react-query.gen';

export function useInvalidateBookAssignments(bookId: string) {
    const qc = useQueryClient();
    return () => qc.invalidateQueries({ queryKey: bookAssignmentsListQueryKey({ path: { bookId } }) });
}

import { useQueryClient } from '@tanstack/react-query';
import { booksListQueryKey } from '@/api/generated/@tanstack/react-query.gen';

export function useInvalidateBooks() {
    const qc = useQueryClient();
    return () => qc.invalidateQueries({ queryKey: booksListQueryKey() });
}

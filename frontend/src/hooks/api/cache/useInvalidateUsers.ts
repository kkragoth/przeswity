import { useQueryClient } from '@tanstack/react-query';
import { usersListQueryKey } from '@/api/generated/@tanstack/react-query.gen';

export function useInvalidateUsers() {
    const qc = useQueryClient();
    return () => qc.invalidateQueries({ queryKey: usersListQueryKey() });
}

import { useQueryClient } from '@tanstack/react-query';
import { meGetQueryKey } from '@/api/generated/@tanstack/react-query.gen';

export function useInvalidateMe() {
    const qc = useQueryClient();
    return () => qc.invalidateQueries({ queryKey: meGetQueryKey() });
}

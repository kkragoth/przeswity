import { useQueryClient } from '@tanstack/react-query';

export function useInvalidate(keyFn: () => readonly unknown[]) {
    const qc = useQueryClient();
    return () => qc.invalidateQueries({ queryKey: keyFn() });
}

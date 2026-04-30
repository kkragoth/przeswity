import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { bookAssignmentDelete, bookAssignmentsList } from '@/api/generated/services.gen';
import type { AssignmentWithUser } from '@/api/generated/types.gen';
import { Button } from '@/components/ui/button';
import { RoleBadge } from '@/components/badges/RoleBadge';
import { EmptyState } from '@/components/feedback/EmptyState';

export function AssignmentList({ bookId }: { bookId: string }) {
    const { t } = useTranslation('common');
    const qc = useQueryClient();
    const queryKey = ['bookAssignments', bookId] as const;

    const { data: assignments = [], isLoading } = useQuery({
        queryKey,
        queryFn: async () => (await bookAssignmentsList({ path: { bookId } })).data ?? [],
    });

    const removeMutation = useMutation({
        mutationFn: (a: AssignmentWithUser) =>
            bookAssignmentDelete({ path: { bookId, role: a.role, userId: a.userId } }),
        onSuccess: () => qc.invalidateQueries({ queryKey }),
    });

    if (isLoading) return <p className="text-sm text-stone-500">{t('states.loading')}</p>;
    if (assignments.length === 0) {
        return <EmptyState title={t('people.noAssignments')} />;
    }

    return (
        <ul className="space-y-2">
            {assignments.map((a) => (
                <li
                    key={`${a.userId}:${a.role}`}
                    className="flex items-center justify-between rounded border bg-white px-3 py-2 text-sm"
                >
                    <div className="flex items-center gap-2">
                        <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: a.user.color }}
                        />
                        <span className="font-medium">{a.user.name}</span>
                        <span className="text-stone-500">{a.user.email}</span>
                        <RoleBadge role={a.role} />
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMutation.mutate(a)}
                        disabled={removeMutation.isPending}
                    >
                        {t('people.removeAssignment')}
                    </Button>
                </li>
            ))}
        </ul>
    );
}

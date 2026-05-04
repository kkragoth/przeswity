import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    bookAssignmentDeleteMutation,
    bookAssignmentsListOptions,
    bookAssignmentsListQueryKey,
} from '@/api/generated/@tanstack/react-query.gen';
import type { AssignmentWithUser } from '@/api/generated/types.gen';
import { Button } from '@/components/ui/button';
import { RoleBadge } from '@/components/badges/RoleBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useInvalidate } from '@/hooks/api/cache/useInvalidate';

export function AssignmentList({ bookId }: { bookId: string }) {
    const { t } = useTranslation('common');
    const invalidateAssignments = useInvalidate(() => bookAssignmentsListQueryKey({ path: { bookId } }));

    const { data: assignments = [], isLoading } = useQuery({
        ...bookAssignmentsListOptions({ path: { bookId } }),
    });

    const removeMutation = useMutation({
        ...bookAssignmentDeleteMutation(),
        onSuccess: () => void invalidateAssignments(),
    });

    const remove = (a: AssignmentWithUser) =>
        removeMutation.mutate({ path: { bookId, role: a.role, userId: a.userId } });

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
                        onClick={() => remove(a)}
                        disabled={removeMutation.isPending}
                    >
                        {t('people.removeAssignment')}
                    </Button>
                </li>
            ))}
        </ul>
    );
}

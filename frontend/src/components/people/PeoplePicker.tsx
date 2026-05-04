import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    bookAssignmentsBulkCreateMutation,
    bookAssignmentsListQueryKey,
    usersListOptions,
} from '@/api/generated/@tanstack/react-query.gen';
import type { BulkCreateAssignmentsBody, User } from '@/api/generated/types.gen';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { usePeoplePickerState } from '@/components/people/hooks/usePeoplePickerState';
import { DraftList, RoleSelect, UserSelect } from '@/components/people/PeoplePickerFields';
import { useFormDialog } from '@/hooks/useFormDialog';
import { useInvalidate } from '@/hooks/api/cache/useInvalidate';

type Draft = BulkCreateAssignmentsBody['assignments'][number];

export function PeoplePicker({ bookId }: { bookId: string }) {
    const { t } = useTranslation('common');
    const invalidateAssignments = useInvalidate(() => bookAssignmentsListQueryKey({ path: { bookId } }));
    const dialog = useFormDialog({}, {
        successKey: 'messages.success',
        errorKey: 'messages.error',
    });
    const state = usePeoplePickerState();

    const { data: users = [] } = useQuery({
        ...usersListOptions(),
    });

    const filtered = users.filter((u) => userMatches(u, state.filter));

    const m = useMutation({
        ...bookAssignmentsBulkCreateMutation(),
        onSuccess: () => {
            dialog.close();
            state.closeDialog();
            dialog.toastSuccess();
            void invalidateAssignments();
        },
        onError: () => dialog.toastError(),
    });

    const submit = () =>
        m.mutate({ path: { bookId }, body: { assignments: state.drafts as Draft[] } });

    const handleOpenChange = (o: boolean) => {
        if (o) dialog.openWith();
        else { dialog.close(); state.closeDialog(); }
    };

    return (
        <Dialog open={dialog.open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    {t('people.addPeople')}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>{t('people.addPeople')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <Input
                        placeholder={t('labels.search')}
                        value={state.filter}
                        onChange={(e) => state.setFilter(e.target.value)}
                    />
                    <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                        <UserSelect
                            users={filtered}
                            value={state.pickedUserId}
                            onChange={state.setPickedUserId}
                        />
                        <RoleSelect value={state.pickedRole} onChange={state.setPickedRole} />
                        <Button onClick={state.addDraft} disabled={!state.pickedUserId}>
                            {t('people.addAssignment')}
                        </Button>
                    </div>
                    <DraftList users={users} drafts={state.drafts} onRemove={state.removeDraft} />
                </div>
                <DialogFooter>
                    <Button onClick={submit} disabled={state.drafts.length === 0 || m.isPending}>
                        {m.isPending ? t('states.saving') : t('people.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function userMatches(u: User, query: string) {
    if (!query) return true;
    const q = query.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
}

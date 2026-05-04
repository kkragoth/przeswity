import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { userCreateMutation, userPatchMutation, usersListQueryKey } from '@/api/generated/@tanstack/react-query.gen';
import type { User } from '@/api/generated/types.gen';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserFormFields } from '@/containers/admin/components/UserFormFields';
import { emptyForm, fromUser, stringToTags, toUpdateUserBody } from '@/containers/admin/hooks/useUserForm';
import { useFormDialog } from '@/hooks/useFormDialog';
import { useInvalidate } from '@/hooks/api/cache/useInvalidate';

type CreateMode = { mode: 'create' };
type EditMode = { mode: 'edit'; user: User };
type UserDialogProps = CreateMode | EditMode;

export function UserDialog(props: UserDialogProps) {
    const { t: ta } = useTranslation('admin');
    const { t: tc } = useTranslation('common');
    const isEdit = props.mode === 'edit';
    const invalidate = useInvalidate(usersListQueryKey);
    const dialog = useFormDialog(isEdit ? fromUser(props.user) : emptyForm(), {
        successKey: 'messages.success',
        errorKey: 'messages.error',
    });

    const editMutation = useMutation({
        ...userPatchMutation(),
        onSuccess: () => { dialog.close(); dialog.toastSuccess(); void invalidate(); },
        onError: () => dialog.toastError(),
    });

    const createMutation = useMutation({
        ...userCreateMutation(),
        onSuccess: () => { dialog.close(); dialog.toastSuccess(); void invalidate(); },
        onError: () => dialog.toastError(),
    });

    const isPending = isEdit ? editMutation.isPending : createMutation.isPending;

    const submit = () => {
        if (isEdit) {
            editMutation.mutate({ path: { id: props.user.id }, body: toUpdateUserBody(dialog.values) });
        } else {
            createMutation.mutate({
                body: {
                    email: dialog.values.email,
                    name: dialog.values.name,
                    password: dialog.values.password,
                    systemRole: dialog.values.systemRole,
                    competencyTags: stringToTags(dialog.values.competencyTagsRaw),
                },
            });
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (open) dialog.openWith(isEdit ? fromUser(props.user) : undefined);
        else dialog.close();
    };

    const trigger = isEdit
        ? <Button size="sm" variant="outline">{tc('actions.edit')}</Button>
        : <Button>{ta('users.newUserCta')}</Button>;

    const title = isEdit ? ta('users.form.editTitle') : ta('users.form.createTitle');

    return (
        <Dialog open={dialog.open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
                <UserFormFields form={dialog.values} onChange={dialog.setValues} includePassword={!isEdit} />
                <DialogFooter>
                    <Button onClick={submit} disabled={isPending}>
                        {isPending ? tc('states.saving') : isEdit ? tc('actions.save') : tc('actions.create')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

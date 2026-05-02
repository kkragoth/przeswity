import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { userPatchMutation } from '@/api/generated/@tanstack/react-query.gen';
import type { User } from '@/api/generated/types.gen';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserFormFields } from '@/containers/admin/components/UserFormFields';
import { fromUser, toUpdateUserBody } from '@/containers/admin/hooks/useUserForm';
import { useFormDialog } from '@/hooks/useFormDialog';

export function EditUserDialog({ user, onSaved }: { user: User; onSaved: () => void }) {
    const { t: ta } = useTranslation('admin');
    const { t: tc } = useTranslation('common');
    const dialog = useFormDialog(fromUser(user), {
        successKey: 'messages.success',
        errorKey: 'messages.error',
    });
    const mutation = useMutation({
        ...userPatchMutation(),
        onSuccess: () => {
            dialog.close();
            dialog.toastSuccess();
            onSaved();
        },
        onError: () => dialog.toastError(),
    });
    const submit = () => mutation.mutate({ path: { id: user.id }, body: toUpdateUserBody(dialog.values) });

    const handleOpenChange = (o: boolean) => {
        if (o) dialog.openWith(fromUser(user));
        else dialog.close();
    };

    return (
        <Dialog open={dialog.open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild><Button size="sm" variant="outline">{tc('actions.edit')}</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>{ta('users.form.editTitle')}</DialogTitle></DialogHeader>
                <UserFormFields form={dialog.values} onChange={dialog.setValues} />
                <DialogFooter>
                    <Button onClick={submit} disabled={mutation.isPending}>
                        {mutation.isPending ? tc('states.saving') : tc('actions.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

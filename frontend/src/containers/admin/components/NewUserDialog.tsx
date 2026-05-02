import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { userCreateMutation } from '@/api/generated/@tanstack/react-query.gen';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserFormFields } from '@/containers/admin/components/UserFormFields';
import { emptyForm, stringToTags } from '@/containers/admin/hooks/useUserForm';
import { useFormDialog } from '@/hooks/useFormDialog';

export function NewUserDialog({ onCreated }: { onCreated: () => void }) {
    const { t: ta } = useTranslation('admin');
    const { t: tc } = useTranslation('common');
    const dialog = useFormDialog(emptyForm(), {
        successKey: 'messages.success',
        errorKey: 'messages.error',
    });
    const mutation = useMutation({
        ...userCreateMutation(),
        onSuccess: () => {
            dialog.close();
            dialog.toastSuccess();
            onCreated();
        },
        onError: () => dialog.toastError(),
    });
    const submit = () =>
        mutation.mutate({
            body: {
                email: dialog.values.email,
                name: dialog.values.name,
                password: dialog.values.password,
                systemRole: dialog.values.systemRole,
                competencyTags: stringToTags(dialog.values.competencyTagsRaw),
            },
        });

    return (
        <Dialog open={dialog.open} onOpenChange={(o) => o ? dialog.openWith() : dialog.close()}>
            <DialogTrigger asChild><Button>{ta('users.newUserCta')}</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>{ta('users.form.createTitle')}</DialogTitle></DialogHeader>
                <UserFormFields form={dialog.values} onChange={dialog.setValues} includePassword />
                <DialogFooter>
                    <Button onClick={submit} disabled={mutation.isPending}>
                        {mutation.isPending ? tc('states.saving') : tc('actions.create')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

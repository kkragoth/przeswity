import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { userCreateMutation } from '@/api/generated/@tanstack/react-query.gen';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserFormFields } from '@/containers/admin/components/UserFormFields';
import { emptyForm, stringToTags } from '@/containers/admin/hooks/useUserForm';

export function NewUserDialog({ onCreated }: { onCreated: () => void }) {
    const { t: ta } = useTranslation('admin');
    const { t: tc } = useTranslation('common');
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const mutation = useMutation({
        ...userCreateMutation(),
        onSuccess: () => {
            setOpen(false);
            setForm(emptyForm());
            onCreated();
        },
    });
    const submit = () =>
        mutation.mutate({
            body: {
                email: form.email,
                name: form.name,
                password: form.password,
                systemRole: form.systemRole,
                competencyTags: stringToTags(form.competencyTagsRaw),
            },
        });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button>{ta('users.newUserCta')}</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>{ta('users.form.createTitle')}</DialogTitle></DialogHeader>
                <UserFormFields form={form} onChange={setForm} includePassword />
                <DialogFooter>
                    <Button onClick={submit} disabled={mutation.isPending}>{mutation.isPending ? tc('states.saving') : tc('actions.create')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { userPatchMutation } from '@/api/generated/@tanstack/react-query.gen';
import type { User } from '@/api/generated/types.gen';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserFormFields } from '@/containers/admin/components/UserFormFields';
import { fromUser, toUpdateUserBody } from '@/containers/admin/hooks/useUserForm';

export function EditUserDialog({ user, onSaved }: { user: User; onSaved: () => void }) {
    const { t: ta } = useTranslation('admin');
    const { t: tc } = useTranslation('common');
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(() => fromUser(user));
    const mutation = useMutation({
        ...userPatchMutation(),
        onSuccess: () => {
            setOpen(false);
            onSaved();
        },
    });
    const submit = () => mutation.mutate({ path: { id: user.id }, body: toUpdateUserBody(form) });

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setForm(fromUser(user)); }}>
            <DialogTrigger asChild><Button size="sm" variant="outline">{tc('actions.edit')}</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>{ta('users.form.editTitle')}</DialogTitle></DialogHeader>
                <UserFormFields form={form} onChange={setForm} />
                <DialogFooter>
                    <Button onClick={submit} disabled={mutation.isPending}>{mutation.isPending ? tc('states.saving') : tc('actions.save')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

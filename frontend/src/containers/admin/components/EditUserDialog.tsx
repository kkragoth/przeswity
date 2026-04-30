import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { userPatch } from '@/api/generated/services.gen';
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
        mutationFn: () => userPatch({ path: { id: user.id }, body: toUpdateUserBody(form) }),
        onSuccess: () => {
            setOpen(false);
            onSaved();
        },
    });

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setForm(fromUser(user)); }}>
            <DialogTrigger asChild><Button size="sm" variant="outline">{tc('actions.edit')}</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>{ta('users.form.editTitle')}</DialogTitle></DialogHeader>
                <UserFormFields form={form} onChange={setForm} />
                <DialogFooter>
                    <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? tc('states.saving') : tc('actions.save')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

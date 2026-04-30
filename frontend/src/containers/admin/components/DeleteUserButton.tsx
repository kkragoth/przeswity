import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { userDeleteMutation } from '@/api/generated/@tanstack/react-query.gen';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { Button } from '@/components/ui/button';

export function DeleteUserButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
    const { t: ta } = useTranslation('admin');
    const { t: tc } = useTranslation('common');
    const [open, setOpen] = useState(false);
    const mutation = useMutation({
        ...userDeleteMutation(),
        onSuccess: () => {
            setOpen(false);
            onDeleted();
        },
    });
    return (
        <ConfirmDialog
            open={open}
            onOpenChange={setOpen}
            trigger={<Button size="sm" variant="destructive">{tc('actions.delete')}</Button>}
            title={ta('users.deleteConfirm')}
            destructive
            confirmLabel={tc('actions.delete')}
            onConfirm={() => mutation.mutate({ path: { id } })}
        />
    );
}

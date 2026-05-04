import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { userDeleteMutation, usersListQueryKey } from '@/api/generated/@tanstack/react-query.gen';
import { ConfirmDialogHost } from '@/components/feedback/ConfirmDialogHost';
import { useConfirmDialog } from '@/components/feedback/useConfirmDialog';
import { useInvalidate } from '@/hooks/api/cache/useInvalidate';
import { Button } from '@/components/ui/button';

export function DeleteUserButton({ id }: { id: string }) {
    const { t: ta } = useTranslation('admin');
    const { t: tc } = useTranslation('common');
    const confirmDlg = useConfirmDialog();
    const invalidate = useInvalidate(usersListQueryKey);
    const mutation = useMutation({
        ...userDeleteMutation(),
        onSuccess: () => void invalidate(),
    });

    const handleClick = async () => {
        const ok = await confirmDlg.confirm({
            title: ta('users.deleteConfirm'),
            destructive: true,
            confirmLabel: tc('actions.delete'),
        });
        if (ok) mutation.mutate({ path: { id } });
    };

    return (
        <>
            <Button size="sm" variant="destructive" disabled={mutation.isPending} onClick={() => void handleClick()}>
                {tc('actions.delete')}
            </Button>
            <ConfirmDialogHost
                dialogState={confirmDlg.dialogState}
                onConfirm={confirmDlg.onConfirm}
                onCancel={confirmDlg.onCancel}
            />
        </>
    );
}

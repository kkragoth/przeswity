import { useImperativeDialog, type ConfirmDialogOpts } from '@/hooks/useImperativeDialog';

type ConfirmOptions = Omit<ConfirmDialogOpts, 'kind'>;
type ConfirmState = ConfirmDialogOpts;

export interface UseConfirmDialogResult {
    confirm: (opts: ConfirmOptions) => Promise<boolean>;
    dialogState: ConfirmState | null;
    onConfirm: () => void;
    onCancel: () => void;
}

export function useConfirmDialog(): UseConfirmDialogResult {
    const dlg = useImperativeDialog<boolean>();
    const dialogState = dlg.state?.kind === 'confirm' ? dlg.state : null;

    return {
        confirm: (opts) => dlg.open({ kind: 'confirm', ...opts }),
        dialogState,
        onConfirm: () => dlg.settle(true),
        onCancel: () => dlg.settle(false),
    };
}

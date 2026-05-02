import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import type { UseConfirmDialogResult } from '@/components/feedback/useConfirmDialog';

/** Renders the imperative confirm dialog driven by useConfirmDialog. */
export function ConfirmDialogHost({ dialogState, onConfirm, onCancel }: Pick<UseConfirmDialogResult, 'dialogState' | 'onConfirm' | 'onCancel'>) {
    if (!dialogState) return null;
    return (
        <ConfirmDialog
            open
            onOpenChange={(open) => { if (!open) onCancel(); }}
            title={dialogState.title}
            description={dialogState.description}
            confirmLabel={dialogState.confirmLabel}
            cancelLabel={dialogState.cancelLabel}
            destructive={dialogState.destructive}
            onConfirm={onConfirm}
        />
    );
}

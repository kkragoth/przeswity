import { useCallback, useRef, useState } from 'react';

interface ConfirmOptions {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
}

interface ConfirmState extends ConfirmOptions {
    resolve: (value: boolean) => void;
}

export interface UseConfirmDialogResult {
    confirm: (opts: ConfirmOptions) => Promise<boolean>;
    dialogState: ConfirmState | null;
    onConfirm: () => void;
    onCancel: () => void;
}

export function useConfirmDialog(): UseConfirmDialogResult {
    const [dialogState, setDialogState] = useState<ConfirmState | null>(null);
    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setDialogState({ ...opts, resolve });
        });
    }, []);

    const onConfirm = useCallback(() => {
        resolveRef.current?.(true);
        resolveRef.current = null;
        setDialogState(null);
    }, []);

    const onCancel = useCallback(() => {
        resolveRef.current?.(false);
        resolveRef.current = null;
        setDialogState(null);
    }, []);

    return { confirm, dialogState, onConfirm, onCancel };
}

import { useRef, useState } from 'react';

export type ConfirmDialogOpts = {
    kind: 'confirm';
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
};

export type PromptDialogOpts = {
    kind: 'prompt';
    initial?: string;
};

export type ImperativeDialogOpts = ConfirmDialogOpts | PromptDialogOpts;

export function useImperativeDialog<T>() {
    const [state, setState] = useState<ImperativeDialogOpts | null>(null);
    const resolveRef = useRef<((v: T) => void) | null>(null);

    const open = (opts: ImperativeDialogOpts): Promise<T> =>
        new Promise<T>((resolve) => {
            resolveRef.current = resolve;
            setState(opts);
        });

    const settle = (value: T) => {
        resolveRef.current?.(value);
        resolveRef.current = null;
        setState(null);
    };

    return { state, open, settle };
}

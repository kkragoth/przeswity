import { toast as sonnerToast } from 'sonner';

export enum ToastKind {
    Info = 'info',
    Success = 'success',
    Error = 'error',
}

export type ToastFn = (msg: string, kind?: ToastKind) => void

export interface UndoToastOptions {
    label: string;
    onUndo: () => void;
    kind?: ToastKind;
    duration?: number;
}

export type ToastWithUndoFn = (msg: string, opts: UndoToastOptions) => void

export interface ToastApi {
    show: ToastFn;
    showWithUndo: ToastWithUndoFn;
}

export function useToast(): ToastApi {
    return {
        show: (msg, kind = ToastKind.Info) => sonnerToast[kind](msg),
        showWithUndo: (msg, { label, onUndo, kind = ToastKind.Success, duration = 6000 }) => {
            const id = sonnerToast[kind](msg, {
                duration,
                action: {
                    label,
                    onClick: () => {
                        onUndo();
                        sonnerToast.dismiss(id);
                    },
                },
            });
        },
    };
}

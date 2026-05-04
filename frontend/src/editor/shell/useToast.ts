import { toast as sonnerToast } from 'sonner';

export enum ToastKind {
    Info = 'info',
    Success = 'success',
    Error = 'error',
}

export type ToastFn = (msg: string, kind?: ToastKind) => void

export function useToast(): { show: ToastFn } {
    return {
        show: (msg, kind = ToastKind.Info) => sonnerToast[kind](msg),
    };
}

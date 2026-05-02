import { toast as sonnerToast } from 'sonner';

type ToastKind = 'info' | 'success' | 'error'

export function useToast() {
    return {
        show: (msg: string, kind: ToastKind = 'info') => sonnerToast[kind](msg),
    };
}

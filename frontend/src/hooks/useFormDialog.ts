import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast as sonnerToast } from 'sonner';

interface UseFormDialogOpts {
    /** i18n key for the success toast. Defaults to 'messages.success'. Pass false to suppress. */
    successKey?: string | false;
    /** i18n key for the error toast. Defaults to 'messages.error'. Pass false to suppress. */
    errorKey?: string | false;
}

export function useFormDialog<T>(initial: T, opts?: UseFormDialogOpts) {
    const { t } = useTranslation('common');
    const [open, setOpen] = useState(false);
    const [values, setValues] = useState<T>(initial);

    const reset = () => setValues(initial);
    const close = () => {
        setOpen(false);
        reset();
    };
    const openWith = (v?: Partial<T>) => {
        setValues(v ? { ...initial, ...v } : initial);
        setOpen(true);
    };

    const toastSuccess = () => {
        if (opts?.successKey === false) return;
        sonnerToast.success(t((opts?.successKey ?? 'messages.success') as never));
    };
    const toastError = () => {
        if (opts?.errorKey === false) return;
        sonnerToast.error(t((opts?.errorKey ?? 'messages.error') as never));
    };

    return { open, values, setValues, openWith, close, reset, toastSuccess, toastError };
}

import { useState } from 'react';

export function useFormDialog<T>(initial: T) {
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

    return { open, values, setValues, openWith, close, reset };
}

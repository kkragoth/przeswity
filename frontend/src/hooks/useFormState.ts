import { useState } from 'react';

export function useFormState<T extends object>(initial: T) {
    const [values, setValues] = useState(initial);
    const setField = <K extends keyof T>(k: K, v: T[K]) =>
        setValues((prev) => ({ ...prev, [k]: v }));
    return { values, setValues, setField };
}

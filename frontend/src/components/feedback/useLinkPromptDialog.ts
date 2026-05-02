import { useCallback, useRef, useState } from 'react';

interface LinkPromptOptions {
    initial?: string;
}

interface LinkPromptState extends LinkPromptOptions {
    resolve: (value: string | null) => void;
}

export interface UseLinkPromptDialogResult {
    prompt: (opts?: LinkPromptOptions) => Promise<string | null>;
    dialogState: LinkPromptState | null;
    onConfirm: (url: string) => void;
    onCancel: () => void;
}

export function useLinkPromptDialog(): UseLinkPromptDialogResult {
    const [dialogState, setDialogState] = useState<LinkPromptState | null>(null);
    const resolveRef = useRef<((value: string | null) => void) | null>(null);

    const prompt = useCallback((opts?: LinkPromptOptions): Promise<string | null> => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setDialogState({ ...opts, resolve });
        });
    }, []);

    const onConfirm = useCallback((url: string) => {
        resolveRef.current?.(url);
        resolveRef.current = null;
        setDialogState(null);
    }, []);

    const onCancel = useCallback(() => {
        resolveRef.current?.(null);
        resolveRef.current = null;
        setDialogState(null);
    }, []);

    return { prompt, dialogState, onConfirm, onCancel };
}

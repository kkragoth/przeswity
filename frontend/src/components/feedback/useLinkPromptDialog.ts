import { useImperativeDialog, type PromptDialogOpts } from '@/hooks/useImperativeDialog';

type LinkPromptOptions = Omit<PromptDialogOpts, 'kind'>;
type LinkPromptState = PromptDialogOpts;

export interface UseLinkPromptDialogResult {
    prompt: (opts?: LinkPromptOptions) => Promise<string | null>;
    dialogState: LinkPromptState | null;
    onConfirm: (url: string) => void;
    onCancel: () => void;
}

export function useLinkPromptDialog(): UseLinkPromptDialogResult {
    const dlg = useImperativeDialog<string | null>();
    const dialogState = dlg.state?.kind === 'prompt' ? dlg.state : null;

    return {
        prompt: (opts?) => dlg.open({ kind: 'prompt', ...opts }),
        dialogState,
        onConfirm: (url: string) => dlg.settle(url),
        onCancel: () => dlg.settle(null),
    };
}

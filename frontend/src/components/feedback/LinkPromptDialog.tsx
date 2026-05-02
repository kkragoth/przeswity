import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { UseLinkPromptDialogResult } from '@/components/feedback/useLinkPromptDialog';

export function LinkPromptDialog({ dialogState, onConfirm, onCancel }: Pick<UseLinkPromptDialogResult, 'dialogState' | 'onConfirm' | 'onCancel'>) {
    const { t } = useTranslation('common');
    const [url, setUrl] = useState('https://');

    useEffect(() => {
        if (dialogState) setUrl(dialogState.initial ?? 'https://');
    }, [dialogState]);

    if (!dialogState) return null;

    const handleConfirm = () => onConfirm(url);
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleConfirm();
    };

    return (
        <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{t('actions.editLink', 'Link URL')}</DialogTitle>
                </DialogHeader>
                <input
                    type="url"
                    autoFocus
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="https://"
                />
                <DialogFooter>
                    <button type="button" className="btn-secondary" onClick={onCancel}>
                        {t('actions.cancel')}
                    </button>
                    <button type="button" className="btn-primary" onClick={handleConfirm}>
                        {t('actions.confirm')}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

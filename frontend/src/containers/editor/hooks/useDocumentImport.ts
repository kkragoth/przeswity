import { useRef, useState, type ChangeEvent } from 'react';
import { marked } from 'marked';
import type { Editor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';

import { MAMMOTH_STYLE_MAP } from '@/editor/io/markdown';
import type { UseConfirmDialogResult } from '@/components/feedback/useConfirmDialog';

interface UseDocumentImportArgs {
    editor: Editor | null;
    onToast?: (msg: string, kind?: 'info' | 'success' | 'error') => void;
    confirmDialog: Pick<UseConfirmDialogResult, 'confirm'>;
}

export function useDocumentImport({ editor, onToast, confirmDialog }: UseDocumentImportArgs) {
    const { t } = useTranslation('editor');
    const inputRef = useRef<HTMLInputElement>(null);
    const [accept, setAccept] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    const preloadDocx = async () => {
        await import('mammoth');
    };

    const open = (kind: 'docx' | 'md') => {
        if (!inputRef.current) return;
        setAccept(kind === 'docx' ? '.docx' : '.md,.markdown,.txt');
        // Safari requires the click to be in a separate task to honour `accept`
        setTimeout(() => inputRef.current?.click(), 0);
    };

    const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!editor) return;
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const ok = await confirmDialog.confirm({
            title: t('fileMenu.confirmReplaceImport', { name: file.name }),
            destructive: true,
        });
        if (!ok) return;
        setIsImporting(true);
        try {
            onToast?.(t('fileMenu.importing'), 'info');
            let html = '';
            if (/\.docx$/i.test(file.name)) {
                const mammoth = await import('mammoth');
                const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, { styleMap: MAMMOTH_STYLE_MAP });
                html = result.value;
            } else {
                html = await marked.parse(await file.text());
            }
            editor.commands.setContent(html, { emitUpdate: true });
            onToast?.(t('fileMenu.imported', { name: file.name }), 'success');
        } catch (error) {
            onToast?.(t('fileMenu.importFailed', { error: (error as Error).message }), 'error');
        } finally {
            setIsImporting(false);
        }
    };

    return { open, isImporting, inputRef, accept, onFileChange, preloadDocx };
}

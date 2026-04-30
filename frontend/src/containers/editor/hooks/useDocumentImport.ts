import { useRef, useState, type ChangeEvent } from 'react';
import { marked } from 'marked';
import type { Editor } from '@tiptap/react';

import { MAMMOTH_STYLE_MAP } from '@/editor/io/markdown';

interface UseDocumentImportArgs {
    editor: Editor | null;
    onToast?: (msg: string, kind?: 'info' | 'success' | 'error') => void;
}

export function useDocumentImport({ editor, onToast }: UseDocumentImportArgs) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [accept, setAccept] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const preloadDocx = async () => {
        await import('mammoth');
    };

    const open = (kind: 'docx' | 'md') => {
        if (!inputRef.current) return;
        setAccept(kind === 'docx' ? '.docx' : '.md,.markdown,.txt');
        setTimeout(() => inputRef.current?.click(), 0);
    };

    const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!editor) return;
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!window.confirm(`Importing "${file.name}" will replace the current document.\n\nProceed?`)) return;
        setIsImporting(true);
        try {
            onToast?.('Importing…', 'info');
            let html = '';
            if (/\.docx$/i.test(file.name)) {
                const mammoth = await import('mammoth');
                const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, { styleMap: MAMMOTH_STYLE_MAP });
                html = result.value;
            } else {
                html = await marked.parse(await file.text());
            }
            editor.commands.setContent(html, { emitUpdate: true });
            onToast?.(`Imported ${file.name}`, 'success');
        } catch (error) {
            onToast?.(`Import failed: ${(error as Error).message}`, 'error');
        } finally {
            setIsImporting(false);
        }
    };

    return { open, isImporting, inputRef, accept, onFileChange, preloadDocx };
}

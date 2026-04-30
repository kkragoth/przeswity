import { useState } from 'react';
import { saveAs } from 'file-saver';
import type { Editor } from '@tiptap/react';

import { editorToMarkdown } from '@/editor/io/markdown';
import type { ExportOptions } from '@/editor/io/docx';

function readPaginationOpts(editor: Editor): Pick<ExportOptions, 'headerLeft' | 'headerRight' | 'footerLeft' | 'footerRight'> {
    const s = (editor.storage as unknown as Record<string, unknown>).PaginationPlus as {
        headerLeft?: string; headerRight?: string; footerLeft?: string; footerRight?: string;
    } | undefined;
    return {
        headerLeft: s?.headerLeft ?? '',
        headerRight: s?.headerRight ?? '',
        footerLeft: s?.footerLeft ?? '',
        footerRight: s?.footerRight ?? '',
    };
}

export function useDocumentExport(editor: Editor | null) {
    const [isExporting, setIsExporting] = useState(false);
    const preloadDocx = async () => {
        await import('@/editor/io/docx');
    };

    const exportDocx = async (opts: { acceptSuggestions: boolean }) => {
        if (!editor) return;
        setIsExporting(true);
        try {
            const { editorToDocxBlob } = await import('@/editor/io/docx');
            const blob = await editorToDocxBlob(editor, { ...opts, ...readPaginationOpts(editor) });
            saveAs(blob, opts.acceptSuggestions ? 'document-clean.docx' : 'document-with-tracks.docx');
        } finally {
            setIsExporting(false);
        }
    };

    const exportMarkdown = () => {
        if (!editor) return;
        saveAs(new Blob([editorToMarkdown(editor)], { type: 'text/markdown;charset=utf-8' }), 'document.md');
    };

    const exportJson = () => {
        if (!editor) return;
        const content = JSON.stringify(editor.getJSON(), null, 2);
        saveAs(new Blob([content], { type: 'application/json;charset=utf-8' }), 'document.json');
    };

    return { exportDocx, exportMarkdown, exportJson, isExporting, preloadDocx };
}

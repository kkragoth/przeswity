import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
import { saveAs } from 'file-saver';
import { editorToMarkdown } from '@/editor/io/markdown';
import { editorToDocxBlob } from '@/editor/io/docx';
import type { ExportOptions } from '@/editor/io/docx';

interface ExportMenuProps {
    editor: Editor | null;
}

// PaginationPlus does not export its storage types — inline shape mirrors the extension's storage object.
function readPaginationOpts(editor: Editor): Pick<ExportOptions, 'headerLeft' | 'headerRight' | 'footerLeft' | 'footerRight'> {
    const s = (editor.storage as unknown as Record<string, unknown>)['PaginationPlus'] as {
        headerLeft?: string; headerRight?: string;
        footerLeft?: string; footerRight?: string;
    } | undefined;
    return {
        headerLeft: s?.headerLeft ?? '',
        headerRight: s?.headerRight ?? '',
        footerLeft: s?.footerLeft ?? '',
        footerRight: s?.footerRight ?? '',
    };
}

export function ExportMenu({ editor }: ExportMenuProps) {
    const { t } = useTranslation('editor');
    const [open, setOpen] = useState(false);

    if (!editor) return null;

    const downloadMarkdown = () => {
        const md = editorToMarkdown(editor);
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        saveAs(blob, 'document.md');
        setOpen(false);
    };

    const downloadDocxClean = async () => {
        try {
            const blob = await editorToDocxBlob(editor, { acceptSuggestions: true, ...readPaginationOpts(editor) });
            saveAs(blob, 'document-clean.docx');
            setOpen(false);
        } catch (err) {
            console.error('DOCX export failed:', err);
        }
    };

    const downloadDocxWithTracks = async () => {
        try {
            const blob = await editorToDocxBlob(editor, { acceptSuggestions: false, ...readPaginationOpts(editor) });
            saveAs(blob, 'document-with-tracks.docx');
            setOpen(false);
        } catch (err) {
            console.error('DOCX export failed:', err);
        }
    };

    return (
        <div className="export-menu">
            <button type="button" className="tb-btn" onClick={() => setOpen((v) => !v)}>
                {t('exportMenu.trigger')}
            </button>
            {open && (
                <div className="export-dropdown" onMouseLeave={() => setOpen(false)}>
                    <button type="button" onClick={downloadMarkdown}>
                        {t('exportMenu.markdown')}
                    </button>
                    <button type="button" onClick={downloadDocxClean}>
                        {t('exportMenu.docxClean')}
                    </button>
                    <button type="button" onClick={downloadDocxWithTracks}>
                        {t('exportMenu.docxTracks')}
                    </button>
                </div>
            )}
        </div>
    );
}

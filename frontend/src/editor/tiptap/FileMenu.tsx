import { useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import mammoth from 'mammoth';
import { marked } from 'marked';
import { saveAs } from 'file-saver';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { editorToMarkdown } from '@/editor/io/markdown';
import { editorToDocxBlob } from '@/editor/io/docx';
import { TEMPLATES } from '@/editor/workflow/templates';
import type { RolePermissions } from '@/editor/identity/types';

const MAMMOTH_STYLE_MAP = [
    "p[style-name='Heading 1'] => h1:fresh",
    "p[style-name='Heading 2'] => h2:fresh",
    "p[style-name='Heading 3'] => h3:fresh",
    "p[style-name='Quote'] => blockquote > p:fresh",
    "p[style-name='List Bullet'] => ul > li:fresh",
    "p[style-name='List Number'] => ol > li:fresh",
    "b => strong",
    "i => em",
    "u => u",
];

interface FileMenuProps {
    editor: Editor
    perms: RolePermissions
    onToast: (msg: string, kind?: 'info' | 'success' | 'error') => void
}

export function FileMenu({ editor, perms, onToast }: FileMenuProps) {
    const { t } = useTranslation('editor');
    const fileRef = useRef<HTMLInputElement>(null);
    const [importKind, setImportKind] = useState<'docx' | 'md'>('docx');

    const startImport = (kind: 'docx' | 'md') => {
        if (!fileRef.current) return;
        setImportKind(kind);
        fileRef.current.accept = kind === 'docx' ? '.docx' : '.md,.markdown,.txt';
        setTimeout(() => fileRef.current?.click(), 0);
    };

    const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!window.confirm(`Importing "${file.name}" will replace the current document.\n\nProceed?`)) return;
        try {
            onToast(t('toolbar.importing', 'Importing…'), 'info');
            let html: string;
            if (/\.docx$/i.test(file.name)) {
                const buf = await file.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer: buf }, { styleMap: MAMMOTH_STYLE_MAP });
                html = result.value;
            } else {
                html = await marked.parse(await file.text());
            }
            editor.commands.setContent(html, { emitUpdate: true });
            onToast(`Imported ${file.name}`, 'success');
        } catch (err) {
            onToast(`Import failed: ${(err as Error).message}`, 'error');
        }
    };

    const applyTemplate = (id: string) => {
        const tmpl = TEMPLATES.find((x) => x.id === id);
        if (!tmpl) return;
        if (!window.confirm(`Apply template "${tmpl.name}"?\n\nThis replaces the current document.`)) return;
        editor.commands.setContent(tmpl.content as never, { emitUpdate: true });
        onToast(`Loaded template: ${tmpl.name}`, 'success');
    };

    const showAny = perms.canEdit || perms.canExport;

    if (!showAny) return null;

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button type="button" className="tb-btn tb-file-trigger">
                        {t('toolbar.fileMenu')}
                        <ChevronDown size={12} style={{ marginLeft: 2 }} />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="tb-dropdown-content">
                    {perms.canEdit && (
                        <>
                            <DropdownMenuLabel>{t('toolbar.import')}</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => startImport('docx')}>
                                DOCX (.docx)
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => startImport('md')}>
                                Markdown (.md)
                            </DropdownMenuItem>
                        </>
                    )}
                    {perms.canEdit && perms.canExport && <DropdownMenuSeparator />}
                    {perms.canExport && (
                        <>
                            <DropdownMenuLabel>{t('toolbar.export')}</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => {
                                const md = editorToMarkdown(editor);
                                saveAs(new Blob([md], { type: 'text/markdown;charset=utf-8' }), 'document.md');
                            }}>
                                Markdown (.md)
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={async () => {
                                const blob = await editorToDocxBlob(editor, { acceptSuggestions: true });
                                saveAs(blob, 'document-clean.docx');
                            }}>
                                DOCX — clean
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={async () => {
                                const blob = await editorToDocxBlob(editor, { acceptSuggestions: false });
                                saveAs(blob, 'document-with-tracks.docx');
                            }}>
                                DOCX — with track changes
                            </DropdownMenuItem>
                        </>
                    )}
                    {perms.canEdit && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>{t('toolbar.templates')}</DropdownMenuLabel>
                            {TEMPLATES.map((tmpl) => (
                                <DropdownMenuItem key={tmpl.id} onSelect={() => applyTemplate(tmpl.id)}>
                                    {tmpl.name}
                                </DropdownMenuItem>
                            ))}
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
            <input
                ref={fileRef}
                type="file"
                style={{ display: 'none' }}
                onChange={onFile}
                data-import-kind={importKind}
            />
        </>
    );
}

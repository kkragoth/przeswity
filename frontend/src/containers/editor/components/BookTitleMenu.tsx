import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import type { Editor } from '@tiptap/react';

import type { RolePermissions } from '@/editor/identity/types';
import { TEMPLATES } from '@/editor/workflow/templates';
import { useDocumentImport } from '@/containers/editor/hooks/useDocumentImport';
import { useDocumentExport } from '@/containers/editor/hooks/useDocumentExport';

interface BookTitleMenuProps {
    bookTitle: string;
    editor: Editor | null;
    perms: RolePermissions;
    onToast: (msg: string, kind?: 'info' | 'success' | 'error') => void;
}

export function BookTitleMenu({ bookTitle, editor, perms, onToast }: BookTitleMenuProps) {
    const { t } = useTranslation('editor');
    const docImport = useDocumentImport({ editor, onToast });
    const docExport = useDocumentExport(editor);
    const [fileMenuOpen, setFileMenuOpen] = useState(false);

    useEffect(() => {
        if (!fileMenuOpen) return;
        void docImport.preloadDocx();
        void docExport.preloadDocx();
    }, [docExport, docImport, fileMenuOpen]);

    const applyTemplate = (id: string) => {
        if (!editor) return;
        const tmpl = TEMPLATES.find((x) => x.id === id);
        if (!tmpl) return;
        if (!window.confirm(`Apply template "${tmpl.name}"?\n\nThis replaces the current document.`)) return;
        editor.commands.setContent(tmpl.content as never, { emitUpdate: true });
        onToast(`Loaded template: ${tmpl.name}`, 'success');
    };

    if (!editor || (!perms.canEdit && !perms.canExport)) {
        return <span className="topbar-book-title" title={bookTitle}>{bookTitle}</span>;
    }

    return (
        <>
            <DropdownMenuPrimitive.Root>
                <DropdownMenuPrimitive.Trigger asChild>
                    <button type="button" className="topbar-book-title" title={bookTitle}>
                        {bookTitle}
                        <ChevronDown size={11} aria-hidden="true" style={{ flexShrink: 0 }} />
                    </button>
                </DropdownMenuPrimitive.Trigger>
                <DropdownMenuPrimitive.Portal>
                    <DropdownMenuPrimitive.Content align="start" sideOffset={6} className="topbar-dropdown-content">
                        <DropdownMenuPrimitive.Sub open={fileMenuOpen} onOpenChange={setFileMenuOpen}>
                            <DropdownMenuPrimitive.SubTrigger className="topbar-dropdown-item topbar-dropdown-subtrigger">
                                <FileText size={14} />{t('toolbar.fileMenu')}
                                <ChevronRight size={12} className="topbar-dropdown-subtrigger-chevron" aria-hidden="true" />
                            </DropdownMenuPrimitive.SubTrigger>
                            <DropdownMenuPrimitive.Portal>
                                <DropdownMenuPrimitive.SubContent className="topbar-dropdown-content" sideOffset={4}>
                                    {perms.canEdit ? (
                                        <>
                                            <div className="topbar-dropdown-label">{t('toolbar.import')}</div>
                                            <DropdownMenuPrimitive.Item className="topbar-dropdown-item" onSelect={() => docImport.open('docx')}>DOCX (.docx)</DropdownMenuPrimitive.Item>
                                            <DropdownMenuPrimitive.Item className="topbar-dropdown-item" onSelect={() => docImport.open('md')}>Markdown (.md)</DropdownMenuPrimitive.Item>
                                        </>
                                    ) : null}
                                    {perms.canEdit && perms.canExport ? <div className="topbar-dropdown-sep" /> : null}
                                    {perms.canExport ? (
                                        <>
                                            <div className="topbar-dropdown-label">{t('toolbar.export')}</div>
                                            <DropdownMenuPrimitive.Item className="topbar-dropdown-item" onSelect={docExport.exportMarkdown}>Markdown (.md)</DropdownMenuPrimitive.Item>
                                            <DropdownMenuPrimitive.Item className="topbar-dropdown-item" onSelect={() => void docExport.exportDocx({ acceptSuggestions: true })}>DOCX — clean</DropdownMenuPrimitive.Item>
                                            <DropdownMenuPrimitive.Item className="topbar-dropdown-item" onSelect={() => void docExport.exportDocx({ acceptSuggestions: false })}>DOCX — with track changes</DropdownMenuPrimitive.Item>
                                        </>
                                    ) : null}
                                    {perms.canEdit ? (
                                        <>
                                            <div className="topbar-dropdown-sep" />
                                            <div className="topbar-dropdown-label">{t('toolbar.templates')}</div>
                                            {TEMPLATES.map((tmpl) => (
                                                <DropdownMenuPrimitive.Item key={tmpl.id} className="topbar-dropdown-item" onSelect={() => applyTemplate(tmpl.id)}>
                                                    {tmpl.name}
                                                </DropdownMenuPrimitive.Item>
                                            ))}
                                        </>
                                    ) : null}
                                </DropdownMenuPrimitive.SubContent>
                            </DropdownMenuPrimitive.Portal>
                        </DropdownMenuPrimitive.Sub>
                    </DropdownMenuPrimitive.Content>
                </DropdownMenuPrimitive.Portal>
            </DropdownMenuPrimitive.Root>

            <input
                ref={docImport.inputRef}
                type="file"
                accept={docImport.accept}
                style={{ display: 'none' }}
                onChange={(e) => void docImport.onFileChange(e)}
                data-importing={docImport.isImporting}
                data-exporting={docExport.isExporting}
            />
        </>
    );
}

import { saveAs } from 'file-saver';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
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
import { useConfirmDialog } from '@/components/feedback/useConfirmDialog';
import { ConfirmDialogHost } from '@/components/feedback/ConfirmDialogHost';
import { useDocumentImport } from '@/containers/editor/hooks/useDocumentImport';
import { ToastKind, type ToastFn } from '@/editor/shell/useToast';

interface FileMenuProps {
    editor: Editor;
    perms: RolePermissions;
    onToast: ToastFn;
}

export function FileMenu({ editor, perms, onToast }: FileMenuProps) {
    const { t } = useTranslation('editor');
    const confirmDlg = useConfirmDialog();
    const docImport = useDocumentImport({ editor, onToast, confirmDialog: confirmDlg });

    const applyTemplate = async (id: string) => {
        const tmpl = TEMPLATES.find((x) => x.id === id);
        if (!tmpl) return;
        const ok = await confirmDlg.confirm({
            title: t('fileMenu.confirmReplaceTemplate', { name: tmpl.name }),
            destructive: true,
        });
        if (!ok) return;
        editor.commands.setContent(tmpl.content as never, { emitUpdate: true });
        onToast(t('fileMenu.templateLoaded', { name: tmpl.name }), ToastKind.Success);
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
                            <DropdownMenuItem onSelect={() => docImport.open('docx')}>
                                {t('fileMenu.importDocx')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => docImport.open('md')}>
                                {t('fileMenu.importMarkdown')}
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
                                {t('fileMenu.exportMarkdown')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={async () => {
                                const blob = await editorToDocxBlob(editor, { acceptSuggestions: true });
                                saveAs(blob, 'document-clean.docx');
                            }}>
                                {t('fileMenu.exportDocxClean')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={async () => {
                                const blob = await editorToDocxBlob(editor, { acceptSuggestions: false });
                                saveAs(blob, 'document-with-tracks.docx');
                            }}>
                                {t('fileMenu.exportDocxTracks')}
                            </DropdownMenuItem>
                        </>
                    )}
                    {perms.canEdit && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>{t('toolbar.templates')}</DropdownMenuLabel>
                            {TEMPLATES.map((tmpl) => (
                                <DropdownMenuItem key={tmpl.id} onSelect={() => void applyTemplate(tmpl.id)}>
                                    {tmpl.name}
                                </DropdownMenuItem>
                            ))}
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
            <input
                ref={docImport.inputRef}
                type="file"
                accept={docImport.accept}
                style={{ display: 'none' }}
                onChange={(e) => void docImport.onFileChange(e)}
            />
            <ConfirmDialogHost
                dialogState={confirmDlg.dialogState}
                onConfirm={confirmDlg.onConfirm}
                onCancel={confirmDlg.onCancel}
            />
        </>
    );
}

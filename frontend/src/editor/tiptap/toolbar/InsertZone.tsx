import type { Editor } from '@tiptap/react';
import { Link2, Undo2, Redo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TbBtn } from '@/editor/tiptap/ToolbarPrimitives';
import { SpecialCharsMenu } from '@/editor/tiptap/formatting/SpecialCharsMenu';
import { useLinkPromptDialog } from '@/components/feedback/useLinkPromptDialog';
import { LinkPromptDialog } from '@/components/feedback/LinkPromptDialog';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const M = isMac ? '⌘' : 'Ctrl';

interface InsertZoneProps {
    editor: Editor;
}

export function InsertZone({ editor }: InsertZoneProps) {
    const { t } = useTranslation('editor');
    const linkDlg = useLinkPromptDialog();

    const setLink = async () => {
        const prev = editor.getAttributes('link').href as string | undefined;
        const url = await linkDlg.prompt({ initial: prev ?? 'https://' });
        if (url === null) return;
        if (url === '') { editor.chain().focus().unsetLink().run(); return; }
        editor.chain().focus().setLink({ href: url }).run();
    };

    return (
        <>
            <div className="tb-group">
                <TbBtn active={editor.isActive('link')} onClick={() => void setLink()} label={t('toolbar.link')} shortcut={`${M}K`}><Link2 size={14} /></TbBtn>
                <SpecialCharsMenu editor={editor} />
            </div>
            <div className="tb-group">
                <TbBtn active={false} onClick={() => editor.chain().focus().undo().run()} label={t('toolbar.undo')} shortcut={`${M}Z`}><Undo2 size={14} /></TbBtn>
                <TbBtn active={false} onClick={() => editor.chain().focus().redo().run()} label={t('toolbar.redo')} shortcut={`${M}⇧Z`}><Redo2 size={14} /></TbBtn>
            </div>
            <LinkPromptDialog
                dialogState={linkDlg.dialogState}
                onConfirm={linkDlg.onConfirm}
                onCancel={linkDlg.onCancel}
            />
        </>
    );
}

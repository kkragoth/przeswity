import type { Editor } from '@tiptap/react';
import { List, ListOrdered, ListChecks } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TbBtn } from '@/editor/tiptap/toolbar/Primitives';

interface BlockFormattingZoneProps {
    editor: Editor;
}

export function BlockFormattingZone({ editor }: BlockFormattingZoneProps) {
    const { t } = useTranslation('editor');
    return (
        <div className="tb-group">
            <TbBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} label={t('toolbar.bulletList')}><List size={14} /></TbBtn>
            <TbBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} label={t('toolbar.orderedList')}><ListOrdered size={14} /></TbBtn>
            <TbBtn active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} label={t('toolbar.taskList')}><ListChecks size={14} /></TbBtn>
        </div>
    );
}

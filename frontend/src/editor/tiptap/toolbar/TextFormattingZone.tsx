import type { Editor } from '@tiptap/react';
import { Bold, Italic, Underline, Strikethrough, Code } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TbBtn, HighlightBtn } from '@/editor/tiptap/toolbar/Primitives';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const M = isMac ? '⌘' : 'Ctrl';

interface TextFormattingZoneProps {
    editor: Editor;
}

export function TextFormattingZone({ editor }: TextFormattingZoneProps) {
    const { t } = useTranslation('editor');
    return (
        <div className="tb-group">
            <TbBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} label={t('toolbar.bold')} shortcut={`${M}B`}><Bold size={14} /></TbBtn>
            <TbBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} label={t('toolbar.italic')} shortcut={`${M}I`}><Italic size={14} /></TbBtn>
            <TbBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} label={t('toolbar.underline')} shortcut={`${M}U`}><Underline size={14} /></TbBtn>
            <TbBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} label={t('toolbar.strike')}><Strikethrough size={14} /></TbBtn>
            <TbBtn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} label={t('toolbar.code')}><Code size={14} /></TbBtn>
            <HighlightBtn editor={editor} label={t('toolbar.highlight')} />
        </div>
    );
}

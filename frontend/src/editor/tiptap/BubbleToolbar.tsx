import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';

interface BubbleToolbarProps {
  editor: Editor
  canComment: boolean
  onAddComment: () => void
}

export function BubbleToolbar({ editor, canComment, onAddComment }: BubbleToolbarProps) {
    const { t } = useTranslation('editor');

    return (
        <BubbleMenu
            editor={editor}
            appendTo={() => document.body}
            options={{ strategy: 'fixed', placement: 'top' }}
            className="bubble-menu-wrap"
        >
            <div className="bubble-menu">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={editor.isActive('bold') ? 'is-active' : ''}
                >
          B
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={editor.isActive('italic') ? 'is-active' : ''}
                >
          I
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={editor.isActive('underline') ? 'is-active' : ''}
                >
          U
                </button>
                {canComment && (
                    <button type="button" onClick={onAddComment} title={t('comments.addCommentTitle')}>
            💬
                    </button>
                )}
            </div>
        </BubbleMenu>
    );
}

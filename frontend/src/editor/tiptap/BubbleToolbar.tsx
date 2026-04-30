import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';

interface BubbleToolbarProps {
  editor: Editor
  canComment: boolean
  onAddComment: () => void
}

export function BubbleToolbar({ editor, canComment, onAddComment }: BubbleToolbarProps) {
    return (
        <BubbleMenu editor={editor}>
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
                    <button type="button" onClick={onAddComment} title="Add comment">
            💬
                    </button>
                )}
            </div>
        </BubbleMenu>
    );
}

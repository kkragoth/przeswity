import type { Editor } from '@tiptap/react'
import { SpecialCharsMenu } from './formatting/SpecialCharsMenu'
import { HIGHLIGHT_PALETTE } from './formatting/Highlight'

interface ToolbarProps {
  editor: Editor
  suggestingMode: boolean
}

export function Toolbar({ editor, suggestingMode }: ToolbarProps) {
  const btn = (active: boolean, onClick: () => void, label: string, title?: string) => (
    <button
      key={label}
      type="button"
      className={active ? 'tb-btn is-active' : 'tb-btn'}
      onClick={onClick}
      title={title ?? label}
    >
      {label}
    </button>
  )

  return (
    <div className={`toolbar${suggestingMode ? ' is-suggesting' : ''}`}>
      <div className="tb-group">
        <select
          className="tb-select"
          value={
            editor.isActive('heading', { level: 1 })
              ? 'h1'
              : editor.isActive('heading', { level: 2 })
                ? 'h2'
                : editor.isActive('heading', { level: 3 })
                  ? 'h3'
                  : editor.isActive('blockquote')
                    ? 'quote'
                    : 'p'
          }
          onChange={(e) => {
            const v = e.target.value
            const chain = editor.chain().focus()
            if (v === 'p') chain.setParagraph().run()
            else if (v === 'h1') chain.setHeading({ level: 1 }).run()
            else if (v === 'h2') chain.setHeading({ level: 2 }).run()
            else if (v === 'h3') chain.setHeading({ level: 3 }).run()
            else if (v === 'quote') chain.setBlockquote().run()
          }}
        >
          <option value="p">Body</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="quote">Quote</option>
        </select>
      </div>
      <div className="tb-divider" />
      <div className="tb-group">
        {btn(
          editor.isActive('bold'),
          () => editor.chain().focus().toggleBold().run(),
          'B',
          'Bold',
        )}
        {btn(
          editor.isActive('italic'),
          () => editor.chain().focus().toggleItalic().run(),
          'I',
          'Italic',
        )}
        {btn(
          editor.isActive('underline'),
          () => editor.chain().focus().toggleUnderline().run(),
          'U',
          'Underline',
        )}
        {btn(
          editor.isActive('strike'),
          () => editor.chain().focus().toggleStrike().run(),
          'S',
          'Strikethrough',
        )}
        <div className="tb-highlight-wrap">
          <button
            type="button"
            className={editor.isActive('highlight') ? 'tb-btn is-active' : 'tb-btn'}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            title="Highlight"
          >
            ▤
          </button>
          <div className="tb-highlight-pop">
            {HIGHLIGHT_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                className="tb-color-swatch"
                style={{ background: c }}
                title={c}
                onClick={() => editor.chain().focus().setHighlight({ color: c }).run()}
              />
            ))}
            <button
              type="button"
              className="tb-color-clear"
              title="Remove highlight"
              onClick={() => editor.chain().focus().unsetHighlight().run()}
            >
              ⊘
            </button>
          </div>
        </div>
      </div>
      <div className="tb-divider" />
      <div className="tb-group">
        {btn(
          editor.isActive('bulletList'),
          () => editor.chain().focus().toggleBulletList().run(),
          '• List',
        )}
        {btn(
          editor.isActive('orderedList'),
          () => editor.chain().focus().toggleOrderedList().run(),
          '1. List',
        )}
        {btn(
          editor.isActive('taskList'),
          () => editor.chain().focus().toggleTaskList().run(),
          '☑',
          'Task list',
        )}
      </div>
      <div className="tb-divider" />
      <div className="tb-group">
        {btn(
          editor.isActive({ textAlign: 'left' }),
          () => editor.chain().focus().setTextAlign('left').run(),
          '⇤',
          'Align left',
        )}
        {btn(
          editor.isActive({ textAlign: 'center' }),
          () => editor.chain().focus().setTextAlign('center').run(),
          '⇔',
          'Align center',
        )}
        {btn(
          editor.isActive({ textAlign: 'right' }),
          () => editor.chain().focus().setTextAlign('right').run(),
          '⇥',
          'Align right',
        )}
      </div>
      <div className="tb-divider" />
      <div className="tb-group">
        {btn(
          editor.isActive('link'),
          () => {
            const prev = editor.getAttributes('link').href as string | undefined
            const url = window.prompt('Link URL', prev ?? 'https://')
            if (url === null) return
            if (url === '') {
              editor.chain().focus().unsetLink().run()
              return
            }
            editor.chain().focus().setLink({ href: url }).run()
          },
          '🔗',
          'Link',
        )}
        {btn(
          false,
          () => editor.chain().focus().undo().run(),
          '↶',
          'Undo',
        )}
        {btn(
          false,
          () => editor.chain().focus().redo().run(),
          '↷',
          'Redo',
        )}
      </div>
      <div className="tb-divider" />
      <div className="tb-group">
        <SpecialCharsMenu editor={editor} />
      </div>
    </div>
  )
}

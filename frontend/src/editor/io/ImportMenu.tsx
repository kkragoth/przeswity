import { useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import mammoth from 'mammoth'
import { marked } from 'marked'

interface ImportMenuProps {
  editor: Editor | null
  onToast?: (msg: string, kind?: 'info' | 'success' | 'error') => void
}

const MAMMOTH_STYLE_MAP = [
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Quote'] => blockquote > p:fresh",
  "p[style-name='Intense Quote'] => blockquote > p:fresh",
  "p[style-name='List Bullet'] => ul > li:fresh",
  "p[style-name='List Number'] => ol > li:fresh",
  "b => strong",
  "i => em",
  "u => u",
]

export function ImportMenu({ editor, onToast }: ImportMenuProps) {
  const [open, setOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [accept, setAccept] = useState<string>('')

  const start = (kind: 'docx' | 'md') => {
    setOpen(false)
    if (!fileRef.current) return
    setAccept(kind === 'docx' ? '.docx' : '.md,.markdown,.txt')
    setTimeout(() => fileRef.current?.click(), 0)
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor) return
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (
      !window.confirm(
        `Importing "${file.name}" will replace the current document.\n\nProceed?`,
      )
    )
      return
    try {
      onToast?.('Importing…', 'info')
      let html: string
      if (/\.docx$/i.test(file.name)) {
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          { styleMap: MAMMOTH_STYLE_MAP },
        )
        html = result.value
        if (result.messages.length) {
          console.warn('Mammoth messages:', result.messages)
        }
      } else {
        const text = await file.text()
        html = await marked.parse(text)
      }
      editor.commands.setContent(html, true)
      onToast?.(`Imported ${file.name}`, 'success')
    } catch (err) {
      console.error(err)
      onToast?.(`Import failed: ${(err as Error).message}`, 'error')
    }
  }

  if (!editor) return null

  return (
    <div className="export-menu">
      <button type="button" className="tb-btn" onClick={() => setOpen((v) => !v)}>
        Import ▾
      </button>
      {open && (
        <div className="export-dropdown" onMouseLeave={() => setOpen(false)}>
          <button type="button" onClick={() => start('docx')}>
            DOCX (.docx)
          </button>
          <button type="button" onClick={() => start('md')}>
            Markdown (.md)
          </button>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={onFile}
      />
    </div>
  )
}

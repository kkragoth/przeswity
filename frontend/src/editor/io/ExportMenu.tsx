import { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { saveAs } from 'file-saver'
import { editorToMarkdown } from './markdown'
import { editorToDocxBlob } from './docx'

interface ExportMenuProps {
  editor: Editor | null
}

export function ExportMenu({ editor }: ExportMenuProps) {
  const [open, setOpen] = useState(false)

  if (!editor) return null

  const downloadMarkdown = () => {
    const md = editorToMarkdown(editor)
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    saveAs(blob, 'document.md')
    setOpen(false)
  }

  const downloadDocxClean = async () => {
    const blob = await editorToDocxBlob(editor, { acceptSuggestions: true })
    saveAs(blob, 'document-clean.docx')
    setOpen(false)
  }

  const downloadDocxWithTracks = async () => {
    const blob = await editorToDocxBlob(editor, { acceptSuggestions: false })
    saveAs(blob, 'document-with-tracks.docx')
    setOpen(false)
  }

  return (
    <div className="export-menu">
      <button type="button" className="tb-btn" onClick={() => setOpen((v) => !v)}>
        Export ▾
      </button>
      {open && (
        <div className="export-dropdown" onMouseLeave={() => setOpen(false)}>
          <button type="button" onClick={downloadMarkdown}>
            Markdown (.md)
          </button>
          <button type="button" onClick={downloadDocxClean}>
            DOCX — clean (suggestions accepted)
          </button>
          <button type="button" onClick={downloadDocxWithTracks}>
            DOCX — with track-change colors
          </button>
        </div>
      )}
    </div>
  )
}

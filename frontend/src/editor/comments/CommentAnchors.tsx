import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import * as Y from 'yjs'
import { useThreads } from './useThreads'
import { authorColor } from './color'
import { Avatar } from '../shell/Avatar'

interface CommentAnchorsProps {
  editor: Editor | null
  doc: Y.Doc
  activeCommentId: string | null
  onSelect: (id: string) => void
}

interface PinAnchor {
  id: string
  top: number
  authorName: string
  authorColor: string
  replies: number
}

const PIN_GAP = 36

export function CommentAnchors({ editor, doc, activeCommentId, onSelect }: CommentAnchorsProps) {
  const threads = useThreads(doc)
  const [pins, setPins] = useState<PinAnchor[]>([])

  const threadKey = threads
    .map((t) => `${t.id}:${t.status}:${t.replies.length}`)
    .join(',')

  useEffect(() => {
    if (!editor) return
    let raf = 0
    const compute = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const dom = editor.view.dom as HTMLElement
        const page = dom.closest('.editor-page') as HTMLElement | null
        if (!page) return
        const pageRect = page.getBoundingClientRect()
        const placed: PinAnchor[] = []
        const seen = new Set<string>()
        for (const t of threads) {
          if (t.status !== 'open') continue
          if (seen.has(t.id)) continue
          const span = dom.querySelector(
            `[data-comment-id="${CSS.escape(t.id)}"]`,
          ) as HTMLElement | null
          if (!span) continue
          seen.add(t.id)
          const r = span.getBoundingClientRect()
          placed.push({
            id: t.id,
            top: r.top - pageRect.top,
            authorName: t.authorName,
            authorColor: authorColor(t),
            replies: t.replies.length,
          })
        }
        placed.sort((a, b) => a.top - b.top)
        for (let i = 1; i < placed.length; i++) {
          if (placed[i].top - placed[i - 1].top < PIN_GAP) {
            placed[i].top = placed[i - 1].top + PIN_GAP
          }
        }
        setPins(placed)
      })
    }
    compute()
    const onTr = () => compute()
    editor.on('transaction', onTr)
    window.addEventListener('resize', compute)
    return () => {
      cancelAnimationFrame(raf)
      editor.off('transaction', onTr)
      window.removeEventListener('resize', compute)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, threadKey])

  if (!editor || pins.length === 0) return null

  return (
    <div className="comment-pins" aria-hidden={false}>
      {pins.map((p) => (
        <button
          type="button"
          key={p.id}
          className={`comment-pin${activeCommentId === p.id ? ' is-active' : ''}`}
          style={{ top: p.top }}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(p.id)
          }}
          title={`${p.authorName}${p.replies > 0 ? ` · ${p.replies} repl${p.replies === 1 ? 'y' : 'ies'}` : ''}`}
        >
          <Avatar
            name={p.authorName}
            color={p.authorColor}
            size="sm"
            ring={activeCommentId === p.id}
            badge={p.replies > 0 ? p.replies : undefined}
          />
        </button>
      ))}
    </div>
  )
}

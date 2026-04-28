import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'

interface OutlineEntry {
  level: number
  text: string
  pos: number
}

interface OutlineSidebarProps {
  editor: Editor | null
}

export function OutlineSidebar({ editor }: OutlineSidebarProps) {
  const [outline, setOutline] = useState<OutlineEntry[]>([])
  const [activePos, setActivePos] = useState<number | null>(null)

  useEffect(() => {
    if (!editor) return
    const update = () => {
      const out: OutlineEntry[] = []
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          out.push({
            level: node.attrs.level as number,
            text: node.textContent,
            pos,
          })
        }
      })
      setOutline(out)
    }
    update()
    editor.on('update', update)
    return () => {
      editor.off('update', update)
    }
  }, [editor])

  if (!editor) return null

  const jumpTo = (pos: number) => {
    setActivePos(pos)
    // Move cursor to just inside the heading so subsequent typing edits there
    editor.chain().focus().setTextSelection(pos + 1).run()

    // Scroll + pulse on the heading's DOM element
    let dom: HTMLElement | null = null
    try {
      dom = editor.view.nodeDOM(pos) as HTMLElement | null
    } catch {
      dom = null
    }
    if (!dom || !dom.scrollIntoView) {
      // Fallback: ask the heading by index in the editor
      const allHeadings = editor.view.dom.querySelectorAll('h1, h2, h3, h4, h5, h6')
      const idx = outline.findIndex((h) => h.pos === pos)
      if (idx >= 0 && idx < allHeadings.length) {
        dom = allHeadings[idx] as HTMLElement
      }
    }
    if (!dom) return
    dom.scrollIntoView({ behavior: 'smooth', block: 'center' })
    dom.classList.remove('heading-pulse')
    void dom.offsetHeight // restart animation
    dom.classList.add('heading-pulse')
    window.setTimeout(() => {
      dom?.classList.remove('heading-pulse')
    }, 1400)
  }

  return (
    <div className="sidebar outline-sidebar">
      <div className="sidebar-title">Outline</div>
      {outline.length === 0 ? (
        <div className="sidebar-empty">
          No headings yet. Use the style dropdown to add one.
        </div>
      ) : (
        <ul className="outline-list">
          {outline.map((h, i) => (
            <li
              key={`${h.pos}-${i}`}
              className={`outline-item outline-level-${h.level}${
                activePos === h.pos ? ' is-active' : ''
              }`}
              onClick={() => jumpTo(h.pos)}
            >
              {h.text || <em>(empty heading)</em>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

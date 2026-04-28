import type { Editor } from '@tiptap/react'

type SuggestionType = 'insertion' | 'deletion'

const META_SKIP = 'suggestionMode/skip'

export function acceptSuggestion(editor: Editor, suggestionId: string, type: SuggestionType): void {
  if (type === 'insertion') {
    const tr = editor.state.tr
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText) return
      const m = node.marks.find(
        (mk) => mk.type.name === 'insertion' && mk.attrs.suggestionId === suggestionId,
      )
      if (m) tr.removeMark(pos, pos + node.nodeSize, m)
    })
    tr.setMeta(META_SKIP, true)
    editor.view.dispatch(tr)
  } else {
    const ranges: { from: number; to: number }[] = []
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText) return
      const m = node.marks.find(
        (mk) => mk.type.name === 'deletion' && mk.attrs.suggestionId === suggestionId,
      )
      if (m) ranges.push({ from: pos, to: pos + node.nodeSize })
    })
    ranges.sort((a, b) => b.from - a.from)
    const tr = editor.state.tr
    for (const r of ranges) tr.delete(r.from, r.to)
    tr.setMeta(META_SKIP, true)
    editor.view.dispatch(tr)
  }
}

export function rejectSuggestion(editor: Editor, suggestionId: string, type: SuggestionType): void {
  if (type === 'insertion') {
    const ranges: { from: number; to: number }[] = []
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText) return
      const m = node.marks.find(
        (mk) => mk.type.name === 'insertion' && mk.attrs.suggestionId === suggestionId,
      )
      if (m) ranges.push({ from: pos, to: pos + node.nodeSize })
    })
    ranges.sort((a, b) => b.from - a.from)
    const tr = editor.state.tr
    for (const r of ranges) tr.delete(r.from, r.to)
    tr.setMeta(META_SKIP, true)
    editor.view.dispatch(tr)
  } else {
    const tr = editor.state.tr
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText) return
      const m = node.marks.find(
        (mk) => mk.type.name === 'deletion' && mk.attrs.suggestionId === suggestionId,
      )
      if (m) tr.removeMark(pos, pos + node.nodeSize, m)
    })
    tr.setMeta(META_SKIP, true)
    editor.view.dispatch(tr)
  }
}

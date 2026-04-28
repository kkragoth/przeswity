import type { Editor } from '@tiptap/react'
import type { Node as PMNode, ResolvedPos } from '@tiptap/pm/model'

interface BlockInfo {
  start: number
  end: number
  node: PMNode
  index: number
  parent: PMNode
  depth: number
}

function resolveTopBlock($pos: ResolvedPos): BlockInfo | null {
  if ($pos.depth < 1) return null
  // Walk up to depth 1 (top-level child of doc)
  const depth = 1
  const node = $pos.node(depth)
  const start = $pos.before(depth)
  const end = $pos.after(depth)
  const parent = $pos.node(depth - 1)
  const index = $pos.index(depth - 1)
  return { start, end, node, index, parent, depth }
}

export function moveBlock(editor: Editor, posInBlock: number, dir: 'up' | 'down'): boolean {
  const state = editor.state
  const $pos = state.doc.resolve(posInBlock)
  const info = resolveTopBlock($pos)
  if (!info) return false
  if (dir === 'up' && info.index === 0) return false
  if (dir === 'down' && info.index === info.parent.childCount - 1) return false

  const tr = state.tr
  if (dir === 'up') {
    const prev = info.parent.child(info.index - 1)
    const prevStart = info.start - prev.nodeSize
    tr.delete(info.start, info.end)
    tr.insert(prevStart, info.node)
  } else {
    const next = info.parent.child(info.index + 1)
    tr.delete(info.start, info.end)
    tr.insert(info.start + next.nodeSize, info.node)
  }
  editor.view.dispatch(tr)
  return true
}

export function duplicateBlock(editor: Editor, posInBlock: number): boolean {
  const state = editor.state
  const $pos = state.doc.resolve(posInBlock)
  const info = resolveTopBlock($pos)
  if (!info) return false
  const tr = state.tr.insert(info.end, info.node.copy(info.node.content))
  editor.view.dispatch(tr)
  return true
}

export function deleteBlock(editor: Editor, posInBlock: number): boolean {
  const state = editor.state
  const $pos = state.doc.resolve(posInBlock)
  const info = resolveTopBlock($pos)
  if (!info) return false
  // Don't delete the last remaining block — it would invalidate the doc
  if (info.parent.childCount === 1) {
    // Replace with empty paragraph instead
    const tr = state.tr.replaceWith(
      info.start,
      info.end,
      state.schema.nodes.paragraph.create(),
    )
    editor.view.dispatch(tr)
    return true
  }
  const tr = state.tr.delete(info.start, info.end)
  editor.view.dispatch(tr)
  return true
}

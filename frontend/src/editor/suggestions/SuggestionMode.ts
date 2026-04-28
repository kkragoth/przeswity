import { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import type { EditorState } from '@tiptap/pm/state'
import { ReplaceStep } from '@tiptap/pm/transform'
import type { Mark } from '@tiptap/pm/model'

export interface SuggestionAuthor {
  id: string
  name: string
  color: string
}

export interface SuggestionModeOptions {
  getEnabled: () => boolean
  getAuthor: () => SuggestionAuthor | null
}

const META_SKIP = 'suggestionMode/skip'

function makeId(): string {
  return Math.random().toString(36).slice(2, 11)
}

function makeMarkAttrs(author: SuggestionAuthor) {
  return {
    suggestionId: makeId(),
    authorId: author.id,
    authorName: author.name,
    authorColor: author.color,
    timestamp: Date.now(),
  }
}

function rangeAllHasMark(state: EditorState, from: number, to: number, markName: string, authorId?: string): boolean {
  let allHave = true
  state.doc.nodesBetween(from, to, (node) => {
    if (!node.isText) return
    const has = node.marks.some(
      (m) => m.type.name === markName && (authorId ? m.attrs.authorId === authorId : true),
    )
    if (!has) allHave = false
  })
  return allHave
}

function backspaceInSuggestingMode(editor: Editor, opts: SuggestionModeOptions): boolean {
  if (!opts.getEnabled()) return false
  const author = opts.getAuthor()
  if (!author) return false

  const { state } = editor
  const { selection, schema, doc } = state
  const insertionType = schema.marks.insertion
  const deletionType = schema.marks.deletion
  if (!insertionType || !deletionType) return false

  if (selection.empty) {
    const pos = selection.from
    if (pos === 0) return false

    const $pos = doc.resolve(pos)
    if ($pos.parentOffset === 0) return false

    const charFrom = pos - 1
    const charTo = pos

    const node = doc.nodeAt(charFrom)
    if (!node || !node.isText) return false

    const hasOurInsertion = node.marks.some(
      (m) => m.type === insertionType && m.attrs.authorId === author.id,
    )
    const hasDeletion = node.marks.some((m) => m.type === deletionType)

    if (hasOurInsertion) {
      const tr = state.tr.delete(charFrom, charTo).setMeta(META_SKIP, true)
      editor.view.dispatch(tr)
      return true
    }

    if (hasDeletion) {
      const tr = state.tr
        .setSelection(TextSelection.create(state.doc, charFrom))
        .setMeta(META_SKIP, true)
      editor.view.dispatch(tr)
      return true
    }

    const mark = deletionType.create(makeMarkAttrs(author))
    const tr = state.tr
      .addMark(charFrom, charTo, mark)
      .setSelection(TextSelection.create(state.doc, charFrom))
      .setMeta(META_SKIP, true)
    editor.view.dispatch(tr)
    return true
  }

  const { from, to } = selection
  if (rangeAllHasMark(state, from, to, 'insertion', author.id)) {
    const tr = state.tr.delete(from, to).setMeta(META_SKIP, true)
    editor.view.dispatch(tr)
    return true
  }
  const mark = deletionType.create(makeMarkAttrs(author))
  const tr = state.tr
    .addMark(from, to, mark)
    .setSelection(TextSelection.create(state.doc, from))
    .setMeta(META_SKIP, true)
  editor.view.dispatch(tr)
  return true
}

function forwardDeleteInSuggestingMode(editor: Editor, opts: SuggestionModeOptions): boolean {
  if (!opts.getEnabled()) return false
  const author = opts.getAuthor()
  if (!author) return false

  const { state } = editor
  const { selection, schema, doc } = state
  const insertionType = schema.marks.insertion
  const deletionType = schema.marks.deletion
  if (!insertionType || !deletionType) return false

  if (selection.empty) {
    const pos = selection.from
    if (pos >= doc.content.size) return false

    const $pos = doc.resolve(pos)
    if ($pos.parentOffset === $pos.parent.content.size) return false

    const charFrom = pos
    const charTo = pos + 1

    const node = doc.nodeAt(charFrom)
    if (!node || !node.isText) return false

    const hasOurInsertion = node.marks.some(
      (m) => m.type === insertionType && m.attrs.authorId === author.id,
    )
    const hasDeletion = node.marks.some((m) => m.type === deletionType)

    if (hasOurInsertion) {
      const tr = state.tr.delete(charFrom, charTo).setMeta(META_SKIP, true)
      editor.view.dispatch(tr)
      return true
    }

    if (hasDeletion) {
      const tr = state.tr
        .setSelection(TextSelection.create(state.doc, charTo))
        .setMeta(META_SKIP, true)
      editor.view.dispatch(tr)
      return true
    }

    const mark = deletionType.create(makeMarkAttrs(author))
    const tr = state.tr
      .addMark(charFrom, charTo, mark)
      .setSelection(TextSelection.create(state.doc, charTo))
      .setMeta(META_SKIP, true)
    editor.view.dispatch(tr)
    return true
  }

  const { from, to } = selection
  if (rangeAllHasMark(state, from, to, 'insertion', author.id)) {
    const tr = state.tr.delete(from, to).setMeta(META_SKIP, true)
    editor.view.dispatch(tr)
    return true
  }
  const mark = deletionType.create(makeMarkAttrs(author))
  const tr = state.tr
    .addMark(from, to, mark)
    .setSelection(TextSelection.create(state.doc, to))
    .setMeta(META_SKIP, true)
  editor.view.dispatch(tr)
  return true
}

export const SuggestionMode = Extension.create<SuggestionModeOptions>({
  name: 'suggestionMode',

  addOptions() {
    return {
      getEnabled: () => false,
      getAuthor: () => null,
    }
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => backspaceInSuggestingMode(editor as Editor, this.options),
      Delete: ({ editor }) => forwardDeleteInSuggestingMode(editor as Editor, this.options),
    }
  },

  addProseMirrorPlugins() {
    const opts = this.options
    return [
      new Plugin({
        key: new PluginKey('suggestionMode-marker'),
        appendTransaction(transactions, _oldState, newState) {
          if (!opts.getEnabled()) return null
          const author = opts.getAuthor()
          if (!author) return null

          if (transactions.some((t) => t.getMeta(META_SKIP))) return null
          if (!transactions.some((t) => t.docChanged)) return null

          const tr = newState.tr
          const insertionType = newState.schema.marks.insertion
          const deletionType = newState.schema.marks.deletion
          if (!insertionType || !deletionType) return null

          let modified = false

          for (let txIdx = 0; txIdx < transactions.length; txIdx++) {
            const ut = transactions[txIdx]
            if (ut.getMeta(META_SKIP)) continue

            for (let i = 0; i < ut.steps.length; i++) {
              const step = ut.steps[i]
              if (!(step instanceof ReplaceStep)) continue
              if (step.slice.size === 0) continue

              let mappedFrom = step.from
              let mappedTo = step.from + step.slice.size
              for (let j = i + 1; j < ut.steps.length; j++) {
                const m = ut.steps[j].getMap()
                mappedFrom = m.map(mappedFrom, 1)
                mappedTo = m.map(mappedTo, -1)
              }
              for (let j = txIdx + 1; j < transactions.length; j++) {
                mappedFrom = transactions[j].mapping.map(mappedFrom, 1)
                mappedTo = transactions[j].mapping.map(mappedTo, -1)
              }

              if (mappedFrom >= mappedTo) continue
              if (mappedTo > newState.doc.content.size) continue

              const mark: Mark = insertionType.create(makeMarkAttrs(author))
              tr.addMark(mappedFrom, mappedTo, mark)
              tr.removeMark(mappedFrom, mappedTo, deletionType)
              modified = true
            }
          }

          if (!modified) return null
          tr.setMeta(META_SKIP, true)
          tr.setMeta('addToHistory', false)
          return tr
        },
      }),
    ]
  },
})

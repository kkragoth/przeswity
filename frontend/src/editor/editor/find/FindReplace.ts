import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import type { EditorState } from '@tiptap/pm/state'
import type { Node as PMNode } from '@tiptap/pm/model'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface Match {
  from: number
  to: number
}

interface FRState {
  query: string
  caseSensitive: boolean
  matches: Match[]
  current: number
}

export const findReplaceKey = new PluginKey<FRState>('findReplace')

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    findReplace: {
      setFindQuery: (query: string, caseSensitive?: boolean) => ReturnType
      findNext: () => ReturnType
      findPrev: () => ReturnType
      replaceCurrent: (replacement: string) => ReturnType
      replaceAll: (replacement: string) => ReturnType
      clearFind: () => ReturnType
    }
  }
}

function computeMatches(doc: PMNode, query: string, caseSensitive: boolean): Match[] {
  if (!query) return []
  const matches: Match[] = []
  doc.descendants((node, pos) => {
    if (!node.isText) return
    const text = node.text ?? ''
    const haystack = caseSensitive ? text : text.toLowerCase()
    const needle = caseSensitive ? query : query.toLowerCase()
    if (!needle) return
    let idx = 0
    while (true) {
      const found = haystack.indexOf(needle, idx)
      if (found === -1) break
      matches.push({ from: pos + found, to: pos + found + needle.length })
      idx = found + needle.length
    }
  })
  return matches
}

function reapply(state: EditorState, partial: Partial<FRState>): FRState {
  const prev = findReplaceKey.getState(state) ?? {
    query: '',
    caseSensitive: false,
    matches: [],
    current: 0,
  }
  const next: FRState = { ...prev, ...partial }
  if (partial.query !== undefined || partial.caseSensitive !== undefined) {
    next.matches = computeMatches(state.doc, next.query, next.caseSensitive)
    next.current = next.matches.length > 0 ? 0 : 0
  }
  return next
}

export const FindReplace = Extension.create({
  name: 'findReplace',

  addProseMirrorPlugins() {
    return [
      new Plugin<FRState>({
        key: findReplaceKey,
        state: {
          init: () => ({
            query: '',
            caseSensitive: false,
            matches: [],
            current: 0,
          }),
          apply(tr, prev, _oldState, newState) {
            const meta = tr.getMeta(findReplaceKey) as Partial<FRState> | undefined
            if (meta) {
              const merged = { ...prev, ...meta }
              if (meta.query !== undefined || meta.caseSensitive !== undefined) {
                merged.matches = computeMatches(newState.doc, merged.query, merged.caseSensitive)
                if (merged.current >= merged.matches.length) merged.current = 0
              }
              return merged
            }
            if (tr.docChanged && prev.query) {
              const matches = computeMatches(newState.doc, prev.query, prev.caseSensitive)
              const current = Math.min(prev.current, Math.max(0, matches.length - 1))
              return { ...prev, matches, current }
            }
            return prev
          },
        },
        props: {
          decorations(state) {
            const s = findReplaceKey.getState(state)
            if (!s || s.matches.length === 0) return DecorationSet.empty
            const decos = s.matches.map((m, i) =>
              Decoration.inline(m.from, m.to, {
                class: i === s.current ? 'find-match find-match-current' : 'find-match',
              }),
            )
            return DecorationSet.create(state.doc, decos)
          },
        },
      }),
    ]
  },

  addCommands() {
    return {
      setFindQuery:
        (query, caseSensitive) =>
        ({ tr, dispatch, state }) => {
          const partial: Partial<FRState> = { query }
          if (caseSensitive !== undefined) partial.caseSensitive = caseSensitive
          tr.setMeta(findReplaceKey, partial)
          if (dispatch) {
            const next = reapply(state, partial)
            if (next.matches.length > 0) {
              const m = next.matches[next.current]
              tr.setSelection(TextSelection.near(state.doc.resolve(m.from)))
              tr.scrollIntoView()
            }
            dispatch(tr)
          }
          return true
        },
      findNext:
        () =>
        ({ tr, dispatch, state }) => {
          const s = findReplaceKey.getState(state)
          if (!s || s.matches.length === 0) return false
          const next = (s.current + 1) % s.matches.length
          tr.setMeta(findReplaceKey, { current: next })
          const m = s.matches[next]
          tr.setSelection(TextSelection.near(state.doc.resolve(m.from)))
          tr.scrollIntoView()
          if (dispatch) dispatch(tr)
          return true
        },
      findPrev:
        () =>
        ({ tr, dispatch, state }) => {
          const s = findReplaceKey.getState(state)
          if (!s || s.matches.length === 0) return false
          const next = (s.current - 1 + s.matches.length) % s.matches.length
          tr.setMeta(findReplaceKey, { current: next })
          const m = s.matches[next]
          tr.setSelection(TextSelection.near(state.doc.resolve(m.from)))
          tr.scrollIntoView()
          if (dispatch) dispatch(tr)
          return true
        },
      replaceCurrent:
        (replacement) =>
        ({ tr, dispatch, state }) => {
          const s = findReplaceKey.getState(state)
          if (!s || s.matches.length === 0) return false
          const m = s.matches[s.current]
          tr.insertText(replacement, m.from, m.to)
          tr.setMeta(findReplaceKey, { query: s.query, caseSensitive: s.caseSensitive })
          if (dispatch) dispatch(tr)
          return true
        },
      replaceAll:
        (replacement) =>
        ({ tr, dispatch, state }) => {
          const s = findReplaceKey.getState(state)
          if (!s || s.matches.length === 0) return false
          for (let i = s.matches.length - 1; i >= 0; i--) {
            const m = s.matches[i]
            tr.insertText(replacement, m.from, m.to)
          }
          tr.setMeta(findReplaceKey, { query: '', caseSensitive: s.caseSensitive })
          if (dispatch) dispatch(tr)
          return true
        },
      clearFind:
        () =>
        ({ tr, dispatch }) => {
          tr.setMeta(findReplaceKey, { query: '', matches: [], current: 0 })
          if (dispatch) dispatch(tr)
          return true
        },
    }
  },
})

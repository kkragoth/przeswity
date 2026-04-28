import { Mark, mergeAttributes } from '@tiptap/core'

export interface TrackChangeAttrs {
  suggestionId: string | null
  authorId: string | null
  authorName: string | null
  authorColor: string | null
  timestamp: number | null
}

const baseAttrs = () => ({
  suggestionId: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute('data-suggestion-id'),
    renderHTML: (attrs: { suggestionId: string | null }) => ({
      'data-suggestion-id': attrs.suggestionId,
    }),
  },
  authorId: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute('data-author-id'),
    renderHTML: (attrs: { authorId: string | null }) => ({
      'data-author-id': attrs.authorId,
    }),
  },
  authorName: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute('data-author-name'),
    renderHTML: (attrs: { authorName: string | null }) => ({
      'data-author-name': attrs.authorName,
    }),
  },
  authorColor: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute('data-author-color'),
    renderHTML: (attrs: { authorColor: string | null }) => {
      const c = attrs.authorColor
      return c
        ? { 'data-author-color': c, style: `--track-color:${c}` }
        : { 'data-author-color': null }
    },
  },
  timestamp: {
    default: null,
    parseHTML: (el: HTMLElement) => Number(el.getAttribute('data-ts') ?? 0) || null,
    renderHTML: (attrs: { timestamp: number | null }) =>
      attrs.timestamp ? { 'data-ts': String(attrs.timestamp) } : {},
  },
})

export const Insertion = Mark.create({
  name: 'insertion',
  inclusive: true,
  spanning: true,
  excludes: '',

  addAttributes() {
    return baseAttrs()
  },

  parseHTML() {
    return [{ tag: 'ins[data-suggestion-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['ins', mergeAttributes({ class: 'tc-ins' }, HTMLAttributes), 0]
  },
})

export const Deletion = Mark.create({
  name: 'deletion',
  inclusive: true,
  spanning: true,
  excludes: '',

  addAttributes() {
    return baseAttrs()
  },

  parseHTML() {
    return [{ tag: 'del[data-suggestion-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['del', mergeAttributes({ class: 'tc-del' }, HTMLAttributes), 0]
  },
})

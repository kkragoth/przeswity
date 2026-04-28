import { Mark, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    highlight: {
      setHighlight: (attrs?: { color?: string }) => ReturnType
      toggleHighlight: (attrs?: { color?: string }) => ReturnType
      unsetHighlight: () => ReturnType
    }
  }
}

export const HIGHLIGHT_PALETTE = [
  '#fef3c7',
  '#bbf7d0',
  '#bae6fd',
  '#fecdd3',
  '#e9d5ff',
  '#fed7aa',
]

export const Highlight = Mark.create({
  name: 'highlight',

  addAttributes() {
    return {
      color: {
        default: '#fef3c7',
        parseHTML: (el) => el.style.backgroundColor || '#fef3c7',
        renderHTML: (attrs) =>
          attrs.color
            ? { style: `background-color: ${attrs.color}; padding: 0 2px; border-radius: 2px;` }
            : {},
      },
    }
  },

  parseHTML() {
    return [{ tag: 'mark' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(HTMLAttributes, { class: 'text-highlight' }), 0]
  },

  addCommands() {
    return {
      setHighlight:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      toggleHighlight:
        (attrs) =>
        ({ commands }) =>
          commands.toggleMark(this.name, attrs),
      unsetHighlight:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    }
  },
})

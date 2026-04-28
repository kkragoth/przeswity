import { Node, mergeAttributes } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableOfContents: {
      insertTOC: () => ReturnType
    }
  }
}

interface Heading {
  level: number
  text: string
  pos: number
}

function collectHeadings(doc: PMNode): Heading[] {
  const out: Heading[] = []
  doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      out.push({
        level: (node.attrs.level as number) ?? 1,
        text: node.textContent,
        pos,
      })
    }
  })
  return out
}

export const TableOfContents = Node.create({
  name: 'tableOfContents',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  parseHTML() {
    return [{ tag: 'div[data-toc]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-toc': '', class: 'toc-block' }), 0]
  },

  addNodeView() {
    return ({ editor }) => {
      const dom = document.createElement('div')
      dom.className = 'toc-block'
      dom.setAttribute('data-toc', '')
      dom.contentEditable = 'false'

      const render = () => {
        const headings = collectHeadings(editor.state.doc).filter((h) => h.text.trim())
        dom.innerHTML = ''
        const title = document.createElement('div')
        title.className = 'toc-title'
        title.textContent = 'Table of contents'
        dom.appendChild(title)
        if (headings.length === 0) {
          const empty = document.createElement('div')
          empty.className = 'toc-empty'
          empty.textContent = 'No headings yet — add an H1/H2/H3 to populate.'
          dom.appendChild(empty)
          return
        }
        const list = document.createElement('div')
        list.className = 'toc-list'
        for (const h of headings) {
          const item = document.createElement('button')
          item.type = 'button'
          item.className = `toc-item toc-level-${h.level}`
          item.textContent = h.text
          item.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            editor.chain().focus().setTextSelection(h.pos + 1).scrollIntoView().run()
          })
          list.appendChild(item)
        }
        dom.appendChild(list)
      }

      render()

      const onUpdate = () => render()
      editor.on('update', onUpdate)

      return {
        dom,
        ignoreMutation: () => true,
        update: () => {
          render()
          return true
        },
        destroy: () => {
          editor.off('update', onUpdate)
        },
      }
    }
  },

  addCommands() {
    return {
      insertTOC:
        () =>
        ({ chain }) =>
          chain().insertContent({ type: 'tableOfContents' }).run(),
    }
  },
})

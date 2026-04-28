import type { Editor } from '@tiptap/react'

interface JSONNode {
  type: string
  attrs?: Record<string, unknown>
  content?: JSONNode[]
  marks?: { type: string; attrs?: Record<string, unknown> }[]
  text?: string
}

function escapeText(s: string): string {
  return s.replace(/([*_`\\[\]()])/g, '\\$1')
}

function applyMarks(text: string, marks: JSONNode['marks']): string {
  if (!marks) return text
  let out = text
  for (const m of marks) {
    if (m.type === 'bold') out = `**${out}**`
    else if (m.type === 'italic') out = `*${out}*`
    else if (m.type === 'code') out = `\`${out}\``
    else if (m.type === 'strike') out = `~~${out}~~`
    else if (m.type === 'underline') out = `<u>${out}</u>`
    else if (m.type === 'link') {
      const href = (m.attrs?.href as string) ?? ''
      out = `[${out}](${href})`
    } else if (m.type === 'insertion') {
      const id = (m.attrs?.suggestionId as string) ?? ''
      out = `<ins data-suggestion-id="${id}">${out}</ins>`
    } else if (m.type === 'deletion') {
      const id = (m.attrs?.suggestionId as string) ?? ''
      out = `<del data-suggestion-id="${id}">${out}</del>`
    } else if (m.type === 'comment') {
      const id = (m.attrs?.commentId as string) ?? ''
      out = `<span data-comment-id="${id}">${out}</span>`
    }
  }
  return out
}

function inlinesToMd(nodes: JSONNode[] | undefined): string {
  if (!nodes) return ''
  return nodes
    .map((n) => {
      if (n.type === 'text') return applyMarks(escapeText(n.text ?? ''), n.marks)
      if (n.type === 'hardBreak') return '  \n'
      return ''
    })
    .join('')
}

function blockToMd(node: JSONNode, depth = 0): string {
  switch (node.type) {
    case 'doc':
      return (node.content ?? []).map((c) => blockToMd(c, depth)).join('\n\n')
    case 'paragraph':
      return inlinesToMd(node.content)
    case 'heading': {
      const level = (node.attrs?.level as number) ?? 1
      return `${'#'.repeat(level)} ${inlinesToMd(node.content)}`
    }
    case 'blockquote':
      return (node.content ?? [])
        .map((c) => blockToMd(c, depth))
        .join('\n\n')
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n')
    case 'bulletList':
      return (node.content ?? [])
        .map((li) => `${'  '.repeat(depth)}- ${inlinesToMd(li.content?.[0]?.content)}${
          li.content && li.content.length > 1
            ? '\n' + li.content.slice(1).map((c) => blockToMd(c, depth + 1)).join('\n')
            : ''
        }`)
        .join('\n')
    case 'orderedList':
      return (node.content ?? [])
        .map(
          (li, i) =>
            `${'  '.repeat(depth)}${i + 1}. ${inlinesToMd(li.content?.[0]?.content)}`,
        )
        .join('\n')
    case 'taskList':
      return (node.content ?? [])
        .map((li) => {
          const checked = li.attrs?.checked ? 'x' : ' '
          return `${'  '.repeat(depth)}- [${checked}] ${inlinesToMd(li.content?.[0]?.content)}`
        })
        .join('\n')
    case 'codeBlock':
      return `\`\`\`${(node.attrs?.language as string) ?? ''}\n${
        node.content?.[0]?.text ?? ''
      }\n\`\`\``
    case 'horizontalRule':
      return '---'
    default:
      return inlinesToMd(node.content)
  }
}

export function editorToMarkdown(editor: Editor): string {
  const json = editor.getJSON() as JSONNode
  return blockToMd(json).replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

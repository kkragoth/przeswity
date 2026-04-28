import type { Editor } from '@tiptap/react'
import * as Y from 'yjs'
import type { ContextMenuItem } from '../shell/ContextMenu'
import type { User } from '../identity/types'
import { ROLE_PERMISSIONS } from '../identity/types'
import type { CommentThread } from '../comments/types'
import { acceptSuggestion, rejectSuggestion } from '../suggestions/suggestionOps'

export interface ContextCallbacks {
  onCreateComment: (id: string, quote: string) => void
  onActiveCommentChange: (id: string) => void
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 11)
}

function clipboardItems(
  editor: Editor,
  hasSelection: boolean,
  canEdit: boolean,
  canSuggest: boolean,
): ContextMenuItem[] {
  return [
    {
      label: 'Cut',
      shortcut: '⌘X',
      icon: '✂',
      disabled: !hasSelection || !canEdit,
      action: () => {
        editor.commands.focus()
        document.execCommand('cut')
      },
    },
    {
      label: 'Copy',
      shortcut: '⌘C',
      icon: '⧉',
      disabled: !hasSelection,
      action: () => {
        editor.commands.focus()
        document.execCommand('copy')
      },
    },
    {
      label: 'Paste',
      shortcut: '⌘V',
      icon: '⌫',
      disabled: !canEdit && !canSuggest,
      action: () => {
        editor.commands.focus()
        try {
          document.execCommand('paste')
        } catch {
          /* most browsers block this */
        }
      },
    },
  ]
}

function suggestionItems(
  editor: Editor,
  insertionMark: { attrs: Record<string, unknown> } | undefined,
  deletionMark: { attrs: Record<string, unknown> } | undefined,
): ContextMenuItem[] {
  const mark = insertionMark ?? deletionMark
  if (!mark) return []
  const type = (insertionMark ? 'insertion' : 'deletion') as 'insertion' | 'deletion'
  const id = mark.attrs.suggestionId as string
  const author = (mark.attrs.authorName as string) ?? 'someone'
  return [
    { label: '', separator: true },
    {
      label: `Accept ${type} by ${author}`,
      icon: '✓',
      action: () => acceptSuggestion(editor, id, type),
    },
    {
      label: `Reject ${type} by ${author}`,
      icon: '✗',
      danger: true,
      action: () => rejectSuggestion(editor, id, type),
    },
  ]
}

function commentItems(
  editor: Editor,
  doc: Y.Doc,
  user: User,
  commentMark: { attrs: Record<string, unknown> } | undefined,
  hasSelection: boolean,
  callbacks: ContextCallbacks,
): ContextMenuItem[] {
  const perms = ROLE_PERMISSIONS[user.role]
  if (commentMark) {
    const id = commentMark.attrs.commentId as string
    const items: ContextMenuItem[] = [
      { label: '', separator: true },
      {
        label: 'Open comment thread',
        icon: '💬',
        action: () => callbacks.onActiveCommentChange(id),
      },
    ]
    if (perms.canResolveComment) {
      items.push(
        {
          label: 'Resolve comment',
          icon: '✓',
          action: () => {
            const map = doc.getMap('comments') as Y.Map<CommentThread>
            const t = map.get(id)
            if (t) {
              map.set(id, {
                ...t,
                status: 'resolved',
                resolvedBy: user.name,
                resolvedAt: Date.now(),
              })
            }
            editor.chain().focus().unsetComment(id).run()
          },
        },
        {
          label: 'Remove comment',
          icon: '🗑',
          danger: true,
          action: () => {
            const map = doc.getMap('comments') as Y.Map<CommentThread>
            map.delete(id)
            editor.chain().focus().unsetComment(id).run()
          },
        },
      )
    }
    return items
  }
  if (hasSelection && perms.canComment) {
    return [
      { label: '', separator: true },
      {
        label: 'Add comment',
        shortcut: '⌘⌥M',
        icon: '💬',
        action: () => {
          const { from, to } = editor.state.selection
          if (from === to) return
          const id = makeId()
          const quote = editor.state.doc.textBetween(from, to, ' ')
          editor.chain().focus().setComment(id).run()
          callbacks.onCreateComment(id, quote)
        },
      },
    ]
  }
  return []
}

function linkItems(
  editor: Editor,
  linkMark: { attrs: Record<string, unknown> } | undefined,
  hasSelection: boolean,
  canEdit: boolean,
): ContextMenuItem[] {
  if (linkMark) {
    const href = linkMark.attrs.href as string
    const items: ContextMenuItem[] = [
      { label: '', separator: true },
      {
        label: 'Open link',
        icon: '↗',
        action: () => window.open(href, '_blank', 'noopener'),
      },
    ]
    if (canEdit) {
      items.push(
        {
          label: 'Edit link',
          icon: '✎',
          action: () => {
            const next = window.prompt('Link URL', href)
            if (next === null) return
            if (next === '') editor.chain().focus().unsetLink().run()
            else editor.chain().focus().extendMarkRange('link').setLink({ href: next }).run()
          },
        },
        {
          label: 'Remove link',
          icon: '⊘',
          danger: true,
          action: () => editor.chain().focus().extendMarkRange('link').unsetLink().run(),
        },
      )
    }
    return items
  }
  if (hasSelection && canEdit) {
    return [
      { label: '', separator: true },
      {
        label: 'Add link',
        shortcut: '⌘K',
        icon: '🔗',
        action: () => {
          const url = window.prompt('Link URL', 'https://')
          if (!url) return
          editor.chain().focus().setLink({ href: url }).run()
        },
      },
    ]
  }
  return []
}

function formattingItems(editor: Editor): ContextMenuItem[] {
  const styleAction = (
    cmd: () => void,
    active: boolean,
    label: string,
    icon: string,
  ): ContextMenuItem => ({
    label,
    icon: active ? '●' : icon,
    action: cmd,
  })
  return [
    { label: '', separator: true },
    {
      label: 'Bold',
      shortcut: '⌘B',
      icon: editor.isActive('bold') ? '●' : '○',
      action: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: 'Italic',
      shortcut: '⌘I',
      icon: editor.isActive('italic') ? '●' : '○',
      action: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: 'Underline',
      shortcut: '⌘U',
      icon: editor.isActive('underline') ? '●' : '○',
      action: () => editor.chain().focus().toggleUnderline().run(),
    },
    { label: '', separator: true },
    styleAction(
      () => editor.chain().focus().setParagraph().run(),
      editor.isActive('paragraph'),
      'Style: Body',
      '¶',
    ),
    styleAction(
      () => editor.chain().focus().setHeading({ level: 1 }).run(),
      editor.isActive('heading', { level: 1 }),
      'Style: Heading 1',
      'H₁',
    ),
    styleAction(
      () => editor.chain().focus().setHeading({ level: 2 }).run(),
      editor.isActive('heading', { level: 2 }),
      'Style: Heading 2',
      'H₂',
    ),
    styleAction(
      () => editor.chain().focus().setHeading({ level: 3 }).run(),
      editor.isActive('heading', { level: 3 }),
      'Style: Heading 3',
      'H₃',
    ),
    styleAction(
      () => editor.chain().focus().setBlockquote().run(),
      editor.isActive('blockquote'),
      'Style: Quote',
      '❝',
    ),
  ]
}

function lookupItems(term: string): ContextMenuItem[] {
  if (!term) return []
  const trimmed = term.slice(0, 200)
  const open = (url: string) => () => window.open(url, '_blank', 'noopener')
  const enc = encodeURIComponent(trimmed)
  return [
    { label: '', separator: true },
    {
      label: 'Define',
      icon: '📖',
      action: open(`https://www.merriam-webster.com/dictionary/${enc}`),
    },
    {
      label: 'Synonyms',
      icon: '⇆',
      action: open(`https://www.merriam-webster.com/thesaurus/${enc}`),
    },
    {
      label: 'Translate',
      icon: '🌐',
      action: open(`https://translate.google.com/?sl=auto&tl=en&text=${enc}&op=translate`),
    },
    {
      label: 'Search Google',
      icon: '🔎',
      action: open(`https://www.google.com/search?q=${enc}`),
    },
  ]
}

export function buildContextItems(
  editor: Editor,
  user: User,
  doc: Y.Doc,
  clickPos: number,
  callbacks: ContextCallbacks,
): ContextMenuItem[] {
  const perms = ROLE_PERMISSIONS[user.role]
  const state = editor.state
  const sel = state.selection
  const hasSelection = !sel.empty

  const node = state.doc.nodeAt(clickPos)
  const marks = node?.marks ?? []
  const commentMark = marks.find((m) => m.type.name === 'comment')
  const insertionMark = marks.find((m) => m.type.name === 'insertion')
  const deletionMark = marks.find((m) => m.type.name === 'deletion')
  const linkMark = marks.find((m) => m.type.name === 'link')

  const items: ContextMenuItem[] = [
    ...clipboardItems(editor, hasSelection, perms.canEdit, perms.canSuggest),
  ]

  if ((insertionMark || deletionMark) && perms.canResolveSuggestion) {
    items.push(...suggestionItems(editor, insertionMark, deletionMark))
  }

  items.push(...commentItems(editor, doc, user, commentMark, hasSelection, callbacks))
  items.push(...linkItems(editor, linkMark, hasSelection, perms.canEdit))

  if (hasSelection && (perms.canEdit || perms.canSuggest)) {
    items.push(...formattingItems(editor))
  }

  if (hasSelection) {
    const term = state.doc.textBetween(sel.from, sel.to, ' ')
    items.push(...lookupItems(term))
  }

  items.push(
    { label: '', separator: true },
    {
      label: 'Select all',
      shortcut: '⌘A',
      icon: '⊡',
      action: () => editor.chain().focus().selectAll().run(),
    },
  )

  return items
}

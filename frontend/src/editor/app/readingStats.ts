import type { Editor } from '@tiptap/react'

export interface ReadingStats {
  words: number
  chars: number
  charsNoSpaces: number
  sentences: number
  paragraphs: number
  readingMinutes: number
}

const WPM = 220 // average reading speed

export function computeReadingStats(editor: Editor): ReadingStats {
  let text = ''
  let paragraphs = 0
  editor.state.doc.descendants((node) => {
    if (node.isTextblock) {
      const t = node.textContent
      if (t.trim()) {
        paragraphs++
        text += t + '\n'
      }
    }
  })
  const trimmed = text.trim()
  const words = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length
  const sentences =
    trimmed.length === 0 ? 0 : (trimmed.match(/[.!?…]+(\s|$)/g) ?? []).length || (paragraphs > 0 ? 1 : 0)
  const chars = trimmed.length
  const charsNoSpaces = trimmed.replace(/\s+/g, '').length
  const readingMinutes = words === 0 ? 0 : Math.max(1, Math.round(words / WPM))
  return { words, chars, charsNoSpaces, sentences, paragraphs, readingMinutes }
}

export function formatReadingMinutes(min: number): string {
  if (min === 0) return '—'
  if (min < 60) return `${min} min read`
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}h ${m}m read`
}

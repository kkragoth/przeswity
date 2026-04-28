import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { findReplaceKey } from './FindReplace'

interface FindReplaceBarProps {
  editor: Editor | null
  open: boolean
  onClose: () => void
}

export function FindReplaceBar({ editor, open, onClose }: FindReplaceBarProps) {
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const [counter, setCounter] = useState({ current: 0, total: 0 })
  const queryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && queryRef.current) queryRef.current.focus()
  }, [open])

  useEffect(() => {
    if (!editor) return
    const update = () => {
      const s = findReplaceKey.getState(editor.state)
      if (!s) return
      setCounter({
        current: s.matches.length === 0 ? 0 : s.current + 1,
        total: s.matches.length,
      })
    }
    editor.on('transaction', update)
    update()
    return () => {
      editor.off('transaction', update)
    }
  }, [editor])

  useEffect(() => {
    if (!editor) return
    if (!open) {
      editor.commands.clearFind()
      return
    }
    editor.commands.setFindQuery(query, caseSensitive)
  }, [editor, query, caseSensitive, open])

  if (!open || !editor) return null

  const next = () => editor.commands.findNext()
  const prev = () => editor.commands.findPrev()
  const replaceOne = () => editor.commands.replaceCurrent(replacement)
  const replaceAll = () => editor.commands.replaceAll(replacement)

  return (
    <div
      className="find-bar"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onClose()
        }
      }}
    >
      <div className="find-row">
        <input
          ref={queryRef}
          type="text"
          placeholder="Find"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (e.shiftKey) prev()
              else next()
            }
          }}
        />
        <span className="find-counter">
          {counter.total === 0 ? 'no results' : `${counter.current} / ${counter.total}`}
        </span>
        <button type="button" onClick={prev} title="Previous (Shift+Enter)">
          ↑
        </button>
        <button type="button" onClick={next} title="Next (Enter)">
          ↓
        </button>
        <label className="find-case">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
          />
          Aa
        </label>
        <button
          type="button"
          onClick={() => setShowReplace((v) => !v)}
          className={showReplace ? 'is-active' : ''}
          title="Toggle replace"
        >
          ⇄
        </button>
        <button type="button" onClick={onClose} title="Close (Esc)">
          ✕
        </button>
      </div>
      {showReplace && (
        <div className="find-row">
          <input
            type="text"
            placeholder="Replace with"
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                replaceOne()
              }
            }}
          />
          <button type="button" onClick={replaceOne} disabled={counter.total === 0}>
            Replace
          </button>
          <button type="button" onClick={replaceAll} disabled={counter.total === 0}>
            Replace all
          </button>
        </div>
      )}
    </div>
  )
}

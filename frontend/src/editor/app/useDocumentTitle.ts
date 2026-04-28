import { useEffect, useState } from 'react'
import * as Y from 'yjs'

const FALLBACK = 'Untitled document'

export function useDocumentTitle(doc: Y.Doc): [string, (next: string) => void] {
  const [title, setTitle] = useState<string>(FALLBACK)
  useEffect(() => {
    const meta = doc.getMap('meta') as Y.Map<string>
    const update = () => setTitle((meta.get('title') as string) ?? FALLBACK)
    update()
    meta.observe(update)
    return () => meta.unobserve(update)
  }, [doc])

  const set = (next: string) => {
    const meta = doc.getMap('meta') as Y.Map<string>
    meta.set('title', next)
    setTitle(next)
  }

  return [title, set]
}

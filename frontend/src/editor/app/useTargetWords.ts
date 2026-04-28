import { useEffect, useState } from 'react'
import * as Y from 'yjs'

export function useTargetWords(doc: Y.Doc): number | undefined {
  const [target, setTarget] = useState<number | undefined>(undefined)
  useEffect(() => {
    const map = doc.getMap('meta') as Y.Map<unknown>
    const update = () => {
      const v = map.get('targetWords')
      setTarget(typeof v === 'number' ? v : undefined)
    }
    update()
    map.observe(update)
    return () => map.unobserve(update)
  }, [doc])
  return target
}

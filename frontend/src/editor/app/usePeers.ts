import { useEffect, useState } from 'react'
import type { HocuspocusProvider } from '@hocuspocus/provider'

export interface Peer {
  name: string
  color: string
}

export function usePeers(provider: HocuspocusProvider): Peer[] {
  const [peers, setPeers] = useState<Peer[]>([])
  useEffect(() => {
    const awareness = provider.awareness
    if (!awareness) return
    const update = () => {
      const out: Peer[] = []
      for (const s of awareness.getStates().values() as Iterable<{
        user?: Peer
      }>) {
        if (s.user?.name) out.push({ name: s.user.name, color: s.user.color })
      }
      setPeers(out)
    }
    awareness.on('change', update)
    update()
    return () => {
      awareness.off('change', update)
    }
  }, [provider])
  return peers
}

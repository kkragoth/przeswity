import { useEffect, useState } from 'react'
import type { HocuspocusProvider } from '@hocuspocus/provider'

export type ConnectionStatus = 'connecting' | 'online' | 'offline'

export function useConnectionStatus(provider: HocuspocusProvider): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  useEffect(() => {
    const onStatus = (e: { connected?: boolean; status?: string }) => {
      if (e.connected === true || e.status === 'connected') setStatus('online')
      else if (e.connected === false || e.status === 'disconnected') setStatus('offline')
    }
    const onSynced = () => setStatus('online')
    provider.on('status', onStatus as never)
    provider.on('synced', onSynced as never)
    setStatus(provider.isConnected ? 'online' : 'connecting')
    return () => {
      provider.off('status', onStatus as never)
      provider.off('synced', onSynced as never)
    }
  }, [provider])
  return status
}

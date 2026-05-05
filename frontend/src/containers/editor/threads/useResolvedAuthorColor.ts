import { useEditorLive } from '@/containers/editor/session/LiveProvider';
import { colorFromName } from '@/editor/shell/Avatar';

/**
 * Returns the author's current color, preferring live peer data over the
 * snapshot value stored in the mark (which may be stale if the user changed
 * their color after the mark was created).
 */
export function useResolvedAuthorColor(authorId: string, fallbackColor: string): string {
    const peers = useEditorLive((s) => s.peers);
    const livePeer = peers.find((p) => p.userId === authorId);
    if (livePeer) return livePeer.color;
    return fallbackColor || colorFromName(authorId);
}

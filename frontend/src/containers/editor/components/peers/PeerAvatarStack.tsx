import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { Editor } from '@tiptap/react';
import type { Peer } from '@/containers/editor/hooks/usePeers';

const VISIBLE_LIMIT = 4;
const IDLE_AFTER_MS = 30_000;
const TICK_MS = 5_000;

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0] ?? '').join('').toUpperCase() || '?';
}

function jumpToPeer(editor: Editor | null, peer: Peer) {
    if (!editor) return;
    const root = editor.view.dom.closest('.editor-scroll') ?? editor.view.dom.closest('.editor-page');
    const node = document.querySelector<HTMLElement>(`.peer-cursor[data-peer="${CSS.escape(peer.userId)}"]`)
        ?? document.querySelector<HTMLElement>(`.peer-cursor[data-client-id="${peer.clientId}"]`);
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    node.classList.add('is-flashing');
    setTimeout(() => node.classList.remove('is-flashing'), 1400);
    void root;
}

function formatIdle(ms: number, t: TFunction<'editor'>): string {
    if (ms < 60_000) return t('peers.activeNow');
    const minutes = Math.floor(ms / 60_000);
    return t('peers.idleFor', { count: minutes });
}

function PeerAvatar({ peer, editor, now }: { peer: Peer; editor: Editor | null; now: number }) {
    const { t } = useTranslation('editor');
    const since = now - peer.lastActiveAt;
    const isIdle = since > IDLE_AFTER_MS;
    const tooltip = `${peer.name} — ${formatIdle(since, t)}`;
    return (
        <button
            type="button"
            className={`peer-avatar${isIdle ? ' is-idle' : ''}`}
            style={{ ['--peer-color' as never]: peer.color }}
            title={tooltip}
            aria-label={tooltip}
            onClick={() => jumpToPeer(editor, peer)}
        >
            {initials(peer.name)}
        </button>
    );
}

export function PeerAvatarStack({ peers, editor }: { peers: Peer[]; editor: Editor | null }) {
    const { t } = useTranslation('editor');
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
        return () => window.clearInterval(id);
    }, []);

    if (peers.length === 0) return null;

    const visible = peers.slice(0, VISIBLE_LIMIT);
    const overflow = peers.length - visible.length;

    return (
        <span className="peer-stack" aria-label={t('peers.stackLabel', { count: peers.length })}>
            {visible.map((p) => (
                <PeerAvatar key={p.userId} peer={p} editor={editor} now={now} />
            ))}
            {overflow > 0 ? (
                <span className="peer-avatar peer-avatar--more" title={t('peers.morePeers', { count: overflow })}>
                    +{overflow}
                </span>
            ) : null}
        </span>
    );
}

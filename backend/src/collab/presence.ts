// INVARIANT: this Map is process-local. Reads via getPresence reflect only THIS process's
// connections. Multi-process deployments must gate the HTTP presence endpoint behind
// env.PRESENCE_API_ENABLED=false. See collab/server.ts.
import type { onConnectPayload, onDisconnectPayload, onChangePayload, onStatelessPayload, Extension } from '@hocuspocus/server';

type Conn = { userId: string; name: string; color: string; connectedAt: number };
type CollabUser = { id: string; name?: string; color?: string };

const presence = new Map<string, Map<string, Conn>>();
const STALE_MS = 60_000;

const bookIdFromDocName = (documentName: string) => documentName.replace(/^book:/, '');

const touch = (documentName: string, connectionId: string | undefined) => {
    if (!connectionId) return;
    const inner = presence.get(bookIdFromDocName(documentName));
    const conn = inner?.get(connectionId);
    if (conn) conn.connectedAt = Date.now();
};

export const presenceExtension: Pick<Extension, 'onConnect' | 'onDisconnect'> = {
    async onConnect({ documentName, context, socketId }: onConnectPayload) {
        const u = (context as { user?: CollabUser } | null)?.user;
        if (!u?.id) return;
        const bookId = bookIdFromDocName(documentName);
        const inner = presence.get(bookId) ?? new Map<string, Conn>();
        const connId = socketId ?? `c${Date.now()}-${Math.random()}`;
        inner.set(connId, {
            userId: u.id,
            name: u.name ?? 'unknown',
            color: u.color ?? '#7c3aed',
            connectedAt: Date.now(),
        });
        presence.set(bookId, inner);
    },
    async onDisconnect({ documentName, socketId }: onDisconnectPayload) {
        const bookId = bookIdFromDocName(documentName);
        const inner = presence.get(bookId);
        if (!inner) return;
        if (socketId) inner.delete(socketId);
        if (inner.size === 0) presence.delete(bookId);
    },
};

export const presenceHeartbeat: Pick<Extension, 'onChange' | 'onStateless'> = {
    async onChange({ documentName, socketId }: onChangePayload) {
        touch(documentName, socketId);
    },
    async onStateless({ documentName, connection, payload }: onStatelessPayload) {
        if (payload !== 'ping') return;
        touch(documentName, connection?.socketId);
    },
};

setInterval(() => {
    const now = Date.now();
    for (const [bookId, inner] of presence) {
        for (const [connId, conn] of inner) {
            if (now - conn.connectedAt > STALE_MS) inner.delete(connId);
        }
        if (inner.size === 0) presence.delete(bookId);
    }
}, 30_000).unref();

export const getPresence = (bookId: string) => {
    const inner = presence.get(bookId);
    if (!inner) return [];
    const byUser = new Map<string, { id: string; name: string; color: string }>();
    for (const c of inner.values()) byUser.set(c.userId, { id: c.userId, name: c.name, color: c.color });
    return Array.from(byUser.values());
};

import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';

export interface CollabBundle {
    id: string;
    doc: Y.Doc;
    provider: HocuspocusProvider;
    persistence: { destroy: () => void | Promise<void> };
    ready: Promise<void>;
}

let nextId = 0;

export function createCollab(bookId: string): CollabBundle {
    const doc = new Y.Doc();
    // Do not attach IndexedDB persistence until documents have a server revision.
    // Yjs merges local and remote updates; stale seeded data in IndexedDB can
    // duplicate whole books and push obsolete content back to the server.
    if (typeof indexedDB !== 'undefined') {
        indexedDB.deleteDatabase(`przeswity-book-${bookId}`);
    }
    const persistence = { destroy: () => undefined };

    const url = (import.meta.env.VITE_COLLAB_URL ?? 'ws://localhost:8080/collaboration') as string;
    const provider = new HocuspocusProvider({
        url,
        name: `book:${bookId}`,
        document: doc,
        // Hocuspocus only sends an auth message when a token is configured.
        // The backend authenticates from websocket cookies, so this sentinel
        // just unblocks the server-side onAuthenticate hook.
        token: 'cookie-session',
    });

    const ready = new Promise<void>((resolve, reject) => {
        provider.on('synced', ({ state }: { state?: boolean } = {}) => {
            if (state !== false) resolve();
        });
        provider.on('authenticationFailed', ({ reason }: { reason?: string } = {}) => {
            reject(new Error(reason ?? 'collaboration authentication failed'));
        });
    });

    return { id: `${bookId}#${++nextId}`, doc, provider, persistence, ready };
}

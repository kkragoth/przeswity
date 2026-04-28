import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { IndexeddbPersistence } from 'y-indexeddb';

export interface CollabBundle {
    id: string;
    doc: Y.Doc;
    provider: HocuspocusProvider;
    persistence: IndexeddbPersistence;
    ready: Promise<void>;
}

let nextId = 0;

export function createCollab(bookId: string): CollabBundle {
    const doc = new Y.Doc();
    const persistence = new IndexeddbPersistence(`przeswity-book-${bookId}`, doc);

    const url = (import.meta.env.VITE_COLLAB_URL ?? 'ws://localhost:8080/collaboration') as string;
    const provider = new HocuspocusProvider({ url, name: `book:${bookId}`, document: doc });

    const ready = new Promise<void>((resolve) => {
        provider.on('synced', () => resolve());
    });

    return { id: `${bookId}#${++nextId}`, doc, provider, persistence, ready };
}

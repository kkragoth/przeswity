// @vitest-environment jsdom
/**
 * Mount the real `CommentsSidebar` against a real Yjs doc with a null editor
 * and run DOM-level interactions inside React `act` boundaries. Used by the
 * editor golden-path regression test.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as Y from 'yjs';

import { CommentsSidebar } from '@/containers/editor/components/comments/CommentsSidebar';
import { EditorSessionProvider } from '@/containers/editor/EditorSessionProvider';
import { EditorLiveProvider } from '@/containers/editor/EditorLiveProvider';
import {
    SessionStoreProvider,
    useSessionStore,
} from '@/containers/editor/SessionStoreProvider';
import { CommentsStoreProvider } from '@/containers/editor/CommentsStoreProvider';
import type { SessionStore } from '@/containers/editor/stores/createSessionStore';
import { Role, type User } from '@/editor/identity/types';
import type { CollabBundle } from '@/editor/collab/yDoc';

export const TEST_USER: User = { id: 'u1', name: 'Alice', role: Role.Editor, color: '#222' };

const buildStubCollab = (doc: Y.Doc): CollabBundle => ({
    id: 'test-book#1',
    doc,
    // The regression test never touches the provider — only the doc — so a
    // typed stub keeps the harness lightweight without spinning up Hocuspocus.
    provider: {} as CollabBundle['provider'],
    persistence: { destroy: () => undefined },
    ready: Promise.resolve(),
});

// jsdom does not implement Element.scrollIntoView; CommentsSidebar calls it.
if (!(Element.prototype as { scrollIntoView?: unknown }).scrollIntoView) {
    (Element.prototype as { scrollIntoView: () => void }).scrollIntoView = () => {};
}

export interface CommentHarness {
    host: HTMLDivElement;
    root: Root;
    doc: Y.Doc;
    setPendingNew: (p: { id: string; quote: string } | null) => Promise<void>;
    getActiveCommentId: () => string | null;
    unmount: () => void;
}

function StoreCapture({ onReady }: { onReady: (store: SessionStore) => void }) {
    const store = useSessionStore();
    onReady(store);
    return null;
}

export function mountCommentSidebar(): CommentHarness {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const doc = new Y.Doc();
    let sessionStore: SessionStore | null = null;

    const collab = buildStubCollab(doc);
    const render = () => {
        root.render(
            <EditorSessionProvider
                user={TEST_USER}
                bookId="test-book"
                collab={collab}
                toast={() => {}}
            >
                <EditorLiveProvider>
                    <SessionStoreProvider>
                        <CommentsStoreProvider>
                            <StoreCapture onReady={(s) => { sessionStore = s; }} />
                            <CommentsSidebar editor={null} />
                        </CommentsStoreProvider>
                    </SessionStoreProvider>
                </EditorLiveProvider>
            </EditorSessionProvider>,
        );
    };
    act(() => render());

    return {
        host, root, doc,
        setPendingNew: async (p) => {
            await act(async () => {
                if (p) sessionStore!.getState().enqueuePendingComment(p);
            });
            await act(async () => {}); // flush effect that consumes pendingNew
        },
        getActiveCommentId: () => sessionStore!.getState().activeCommentId,
        unmount: () => { act(() => root.unmount()); host.remove(); },
    };
}

// React's controlled-input valueTracker requires the native setter to detect
// programmatic value changes; otherwise the synthetic `input` event keeps the
// previous value.
const NATIVE_TEXTAREA_VALUE = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype, 'value',
)?.set;

export const typeIntoTextarea = (el: HTMLTextAreaElement, value: string) => act(async () => {
    NATIVE_TEXTAREA_VALUE?.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
});

export const click = async (el: Element) => {
    await act(async () => {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await act(async () => {});
};

export const flush = () => act(async () => {});

export const findByExactText = (host: HTMLElement, text: string): HTMLElement | null => {
    const all = host.querySelectorAll<HTMLElement>('button, span, div');
    for (const el of all) if (el.textContent?.trim() === text) return el;
    return null;
};

export const findButtonContaining = (host: HTMLElement, text: string): HTMLButtonElement | null => {
    const buttons = host.querySelectorAll<HTMLButtonElement>('button');
    for (const b of buttons) if (b.textContent?.includes(text)) return b;
    return null;
};

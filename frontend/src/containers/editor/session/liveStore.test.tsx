// @vitest-environment jsdom
/**
 * T-24 acceptance gate.
 *
 * Updating `peers` in the live store must NOT re-render leaves that don't
 * subscribe to `peers`. We mount a tiny harness inside `EditorLiveProvider`,
 * fire a `setPeers` action through the underlying zustand store, and assert
 * the non-subscribing leaf's render counter did not move while the
 * subscribing leaf's did.
 */
import { act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));

import { EditorSessionProvider } from '@/containers/editor/session/SessionProvider';
import {
    EditorLiveProvider,
    useEditorLive,
    useEditorLiveStore,
} from '@/containers/editor/session/LiveProvider';
import { Role, type User } from '@/editor/identity/types';
import type { CollabBundle } from '@/editor/collab/yDoc';
import type { Peer } from '@/containers/editor/hooks/usePeers';

const TEST_USER: User = { id: 'u1', name: 'Alice', role: Role.Editor, color: '#222' };

const buildStubCollab = (doc: Y.Doc): CollabBundle => ({
    id: 'live-test#1',
    doc,
    provider: {} as CollabBundle['provider'],
    persistence: { destroy: () => undefined },
    ready: Promise.resolve(),
});

interface RenderCounters {
    nonSubscriber: number;
    peerSubscriber: number;
}

function makeHarness() {
    const counters: RenderCounters = { nonSubscriber: 0, peerSubscriber: 0 };
    let storeRef: ReturnType<typeof useEditorLiveStore> | null = null;

    function NonSubscriber() {
        const renders = useRef(0);
        renders.current += 1;
        counters.nonSubscriber = renders.current;
        // Reads ONLY the editor handle (not peers). Updating peers must not
        // re-render this leaf.
        useEditorLive((s) => s.suggesting.effective);
        return <div data-testid="non-sub">non</div>;
    }

    function PeerSubscriber() {
        const renders = useRef(0);
        renders.current += 1;
        counters.peerSubscriber = renders.current;
        const peerCount = useEditorLive((s) => s.peers.length);
        return <div data-testid="peer-sub">{peerCount}</div>;
    }

    function StoreCapture() {
        storeRef = useEditorLiveStore();
        return null;
    }

    return {
        counters,
        getStore: () => storeRef!,
        Tree: () => (
            <>
                <StoreCapture />
                <NonSubscriber />
                <PeerSubscriber />
            </>
        ),
    };
}

let host: HTMLDivElement;
let root: Root;
let doc: Y.Doc;

beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    doc = new Y.Doc();
});

afterEach(() => {
    act(() => root.unmount());
    host.remove();
    doc.destroy();
});

describe('EditorLiveProvider — peers fan-out (T-24)', () => {
    it('updating peers re-renders peer subscribers but NOT other leaves', () => {
        const harness = makeHarness();
        const collab = buildStubCollab(doc);

        act(() => {
            root.render(
                <EditorSessionProvider user={TEST_USER} bookId="b" bookTitle="Test" collab={collab} toast={() => {}}>
                    <EditorLiveProvider>
                        <harness.Tree />
                    </EditorLiveProvider>
                </EditorSessionProvider>,
            );
        });

        const nonBefore = harness.counters.nonSubscriber;
        const peerBefore = harness.counters.peerSubscriber;

        const nextPeers: Peer[] = [
            { name: 'Bob', color: '#f00', userId: 'u2', clientId: 7, lastActiveAt: Date.now() },
        ];
        act(() => {
            harness.getStore().getState().setPeers(nextPeers);
        });

        expect(harness.counters.peerSubscriber).toBeGreaterThan(peerBefore);
        expect(harness.counters.nonSubscriber).toBe(nonBefore);
    });

    it('selecting peers length is shallow-stable across no-op updates', () => {
        const harness = makeHarness();
        const collab = buildStubCollab(doc);

        act(() => {
            root.render(
                <EditorSessionProvider user={TEST_USER} bookId="b" bookTitle="Test" collab={collab} toast={() => {}}>
                    <EditorLiveProvider>
                        <harness.Tree />
                    </EditorLiveProvider>
                </EditorSessionProvider>,
            );
        });

        const peerBefore = harness.counters.peerSubscriber;
        // Same length array → selector returns same number → no re-render.
        const samePeers: Peer[] = [];
        act(() => {
            harness.getStore().getState().setPeers(samePeers);
        });
        expect(harness.counters.peerSubscriber).toBe(peerBefore);
    });
});

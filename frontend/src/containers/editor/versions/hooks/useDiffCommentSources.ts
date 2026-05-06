import { useRef, useMemo, useEffect, useState } from 'react';
import * as Y from 'yjs';
import { useCommentThreads } from '@/editor/comments/useCommentThreads';
import { getThreadMap } from '@/editor/comments/threadOps';
import type { CommentThread } from '@/editor/comments/types';
import { isCurrent, type DiffSide } from '@/containers/editor/session/editorViewStore';

export enum DiffCommentSideKind {
    Live = 'live',
    Snapshot = 'snapshot',
}

export type DiffCommentSource =
    | { kind: DiffCommentSideKind.Live; threads: Map<string, CommentThread> }
    | { kind: DiffCommentSideKind.Snapshot; threads: Map<string, CommentThread> };

function yMapToThreadMap(ymap: Y.Map<CommentThread>): Map<string, CommentThread> {
    return new Map(Array.from(ymap.entries()));
}

async function loadSnapshotThreads(bytes: Blob): Promise<Map<string, CommentThread>> {
    const buffer = await bytes.arrayBuffer();
    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(buffer));
    const map = yMapToThreadMap(getThreadMap(doc));
    doc.destroy();
    return map;
}

interface DiffCommentSources {
    left: DiffCommentSource | null;
    right: DiffCommentSource | null;
}

/**
 * Resolves comment threads for both sides of a diff view.
 * Live side reads from the active Y.Doc reactively; snapshot sides load
 * threads from blob bytes and cache by snapshot id.
 */
export function useDiffCommentSources(
    left: DiffSide,
    right: DiffSide,
    leftBytes: Blob | undefined,
    rightBytes: Blob | undefined,
    liveDoc: Y.Doc,
): DiffCommentSources {
    // Cache snapshot thread maps keyed by snapshot id
    const snapshotCache = useRef<Map<string, Map<string, CommentThread>>>(new Map());
    const [cacheVersion, setCacheVersion] = useState(0);

    // Subscribe to live doc threads reactively
    const liveThreads = useCommentThreads(liveDoc);
    const liveThreadMap = useMemo(
        () => new Map(liveThreads.map((t) => [t.id, t])),
        [liveThreads],
    );

    // Load snapshot bytes when they become available
    useEffect(() => {
        const leftId = isCurrent(left) ? null : left.id;
        if (!leftId || !leftBytes || snapshotCache.current.has(leftId)) return;
        void loadSnapshotThreads(leftBytes).then((map) => {
            snapshotCache.current.set(leftId, map);
            setCacheVersion((v) => v + 1);
        });
    }, [left, leftBytes]);

    useEffect(() => {
        const rightId = isCurrent(right) ? null : right.id;
        if (!rightId || !rightBytes || snapshotCache.current.has(rightId)) return;
        void loadSnapshotThreads(rightBytes).then((map) => {
            snapshotCache.current.set(rightId, map);
            setCacheVersion((v) => v + 1);
        });
    }, [right, rightBytes]);

    return useMemo(() => {
        function resolveSource(side: DiffSide): DiffCommentSource | null {
            if (isCurrent(side)) {
                return { kind: DiffCommentSideKind.Live, threads: liveThreadMap };
            }
            const cached = snapshotCache.current.get(side.id);
            if (!cached) return null;
            return { kind: DiffCommentSideKind.Snapshot, threads: cached };
        }

        return {
            left: resolveSource(left),
            right: resolveSource(right),
        };
    // cacheVersion triggers re-memoization when a snapshot finishes loading
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [left, right, liveThreadMap, cacheVersion]);
}

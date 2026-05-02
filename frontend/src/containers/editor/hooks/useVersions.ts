import { useState } from 'react';
import * as Y from 'yjs';
import { yDocToProsemirrorJSON } from 'y-prosemirror';
import type { Editor } from '@tiptap/react';

import type { User } from '@/editor/identity/types';
import type { VersionSnapshot } from '@/editor/versions/types';
import { buildDiffDoc, type JSONNode } from '@/editor/versions/diffDoc';
import { VERSIONS_AUTO_KEEP, VERSIONS_PERSIST_DEBOUNCE_MS } from '@/editor/constants';
import { useLocalStorageState } from '@/utils/storage/useLocalStorageState';

const STORAGE_PREFIX = 'przeswity.versions';

function storageKey(bookId: string): string {
    return `${STORAGE_PREFIX}:${bookId}`;
}

function jsonFromSnapshot(snapshot: VersionSnapshot): JSONNode {
    const tempDoc = new Y.Doc();
    Y.applyUpdate(tempDoc, new Uint8Array(snapshot.state));
    const json = yDocToProsemirrorJSON(tempDoc, 'default') as JSONNode;
    tempDoc.destroy();
    return json;
}

export function useVersions(doc: Y.Doc, user: User, editor: Editor | null, bookId: string) {
    const [versions, setVersions] = useLocalStorageState<VersionSnapshot[]>(
        storageKey(bookId),
        [],
        { debounceMs: VERSIONS_PERSIST_DEBOUNCE_MS },
    );
    const [label, setLabel] = useState('');

    const snapshot = (auto = false, customLabel?: string) => {
        const state = Y.encodeStateAsUpdate(doc);
        const next: VersionSnapshot = {
            id: crypto.randomUUID(),
            label: customLabel ?? (label.trim() || `Snapshot ${new Date().toLocaleString()}`),
            authorName: user.name,
            createdAt: Date.now(),
            state: Array.from(state),
            auto,
        };
        setVersions((prev) => {
            const merged = [next, ...prev];
            if (!auto) return merged;
            const autos = merged.filter((item) => item.auto);
            if (autos.length <= VERSIONS_AUTO_KEEP) return merged;
            const dropIds = new Set(autos.slice(VERSIONS_AUTO_KEEP).map((item) => item.id));
            return merged.filter((item) => !dropIds.has(item.id));
        });
        if (!auto) setLabel('');
        return next;
    };

    const remove = (id: string) => setVersions((prev) => prev.filter((item) => item.id !== id));

    const restore = (snapshot: VersionSnapshot) => {
        if (!editor) return false;
        editor.commands.setContent(jsonFromSnapshot(snapshot), { emitUpdate: true });
        return true;
    };

    const diffWithCurrent = (snapshot: VersionSnapshot) => {
        if (!editor) return null;
        const olderJson = jsonFromSnapshot(snapshot);
        const newerJson = editor.getJSON() as JSONNode;
        return {
            diffJson: buildDiffDoc(editor.schema, olderJson, newerJson),
            olderJson,
            newerJson,
            olderLabel: snapshot.label,
            newerLabel: 'Current',
            snapshot,
        };
    };

    const diffBetween = (a: VersionSnapshot, b: VersionSnapshot) => {
        if (!editor) return null;
        const [older, newer] = a.createdAt <= b.createdAt ? [a, b] : [b, a];
        const olderJson = jsonFromSnapshot(older);
        const newerJson = jsonFromSnapshot(newer);
        return {
            diffJson: buildDiffDoc(editor.schema, olderJson, newerJson),
            olderJson,
            newerJson,
            olderLabel: older.label,
            newerLabel: newer.label,
            older,
        };
    };

    return {
        versions,
        label,
        setLabel,
        snapshot,
        remove,
        restore,
        diffWithCurrent,
        diffBetween,
    };
}

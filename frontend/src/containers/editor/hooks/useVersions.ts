import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { yDocToProsemirrorJSON } from 'y-prosemirror';
import type { Editor } from '@tiptap/react';

import type { User } from '@/editor/identity/types';
import type { VersionSnapshot } from '@/editor/versions/types';
import { buildDiffDoc, type JSONNode } from '@/editor/versions/diffDoc';

const STORAGE_KEY = 'editor-poc.versions';
const AUTO_KEEP = 8;

function loadVersions(): VersionSnapshot[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as VersionSnapshot[];
    } catch {
        return [];
    }
}

function jsonFromSnapshot(snapshot: VersionSnapshot): JSONNode {
    const tempDoc = new Y.Doc();
    Y.applyUpdate(tempDoc, new Uint8Array(snapshot.state));
    const json = yDocToProsemirrorJSON(tempDoc, 'default') as JSONNode;
    tempDoc.destroy();
    return json;
}

export function useVersions(doc: Y.Doc, user: User, editor: Editor | null) {
    const [versions, setVersions] = useState<VersionSnapshot[]>(loadVersions);
    const [label, setLabel] = useState('');

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
    }, [versions]);

    const snapshot = (auto = false, customLabel?: string) => {
        const state = Y.encodeStateAsUpdate(doc);
        const next: VersionSnapshot = {
            id: Math.random().toString(36).slice(2, 11),
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
            if (autos.length <= AUTO_KEEP) return merged;
            const dropIds = new Set(autos.slice(AUTO_KEEP).map((item) => item.id));
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
            diffJson: buildDiffDoc(olderJson, newerJson),
            olderJson,
            newerJson,
            olderLabel: snapshot.label,
            newerLabel: 'Current',
            snapshot,
        };
    };

    const diffBetween = (a: VersionSnapshot, b: VersionSnapshot) => {
        const [older, newer] = a.createdAt <= b.createdAt ? [a, b] : [b, a];
        const olderJson = jsonFromSnapshot(older);
        const newerJson = jsonFromSnapshot(newer);
        return {
            diffJson: buildDiffDoc(olderJson, newerJson),
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

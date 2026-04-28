import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { yDocToProsemirrorJSON } from 'y-prosemirror';
import type { Editor } from '@tiptap/react';
import type { User } from '../identity/types';
import type { VersionSnapshot } from './types';
import { VersionDiffModal } from './VersionDiffModal';
import { buildDiffDoc, type JSONNode } from './diffDoc';

interface VersionsPanelProps {
  doc: Y.Doc
  user: User
  editor: Editor | null
  onToast?: (msg: string, kind?: 'info' | 'success' | 'error') => void
}

const AUTO_INTERVAL_MS = 5 * 60 * 1000;
const AUTO_KEEP = 8;

const STORAGE_KEY = 'editor-poc.versions';

function loadVersions(): VersionSnapshot[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as VersionSnapshot[];
    } catch {
        return [];
    }
}

function saveVersions(v: VersionSnapshot[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
}

function jsonFromSnapshot(snapshot: VersionSnapshot): JSONNode {
    const tempDoc = new Y.Doc();
    Y.applyUpdate(tempDoc, new Uint8Array(snapshot.state));
    const json = yDocToProsemirrorJSON(tempDoc, 'default') as JSONNode;
    tempDoc.destroy();
    return json;
}

interface DiffState {
  diffJson: JSONNode
  olderJson?: JSONNode
  newerJson?: JSONNode
  olderLabel: string
  newerLabel: string
  restoreFn?: () => void
}

export function VersionsPanel({ doc, user, editor, onToast }: VersionsPanelProps) {
    const [versions, setVersions] = useState<VersionSnapshot[]>(loadVersions);
    const [label, setLabel] = useState('');
    const [diff, setDiff] = useState<DiffState | null>(null);
    const [compareSrc, setCompareSrc] = useState<string | null>(null);

    useEffect(() => {
        saveVersions(versions);
    }, [versions]);

    const snapshot = (auto = false, customLabel?: string) => {
        const state = Y.encodeStateAsUpdate(doc);
        const v: VersionSnapshot = {
            id: Math.random().toString(36).slice(2, 11),
            label: customLabel ?? (label.trim() || `Snapshot ${new Date().toLocaleString()}`),
            authorName: user.name,
            createdAt: Date.now(),
            state: Array.from(state),
            auto,
        };
        setVersions((vs) => {
            const next = [v, ...vs];
            if (auto) {
                const autos = next.filter((x) => x.auto);
                if (autos.length > AUTO_KEEP) {
                    const dropIds = new Set(autos.slice(AUTO_KEEP).map((x) => x.id));
                    return next.filter((x) => !dropIds.has(x.id));
                }
            }
            return next;
        });
        if (!auto) {
            setLabel('');
            onToast?.(`Snapshot saved: ${v.label}`, 'success');
        }
    };

    // Auto-snapshot: throttle once per AUTO_INTERVAL_MS while edits are happening
    useEffect(() => {
        let lastAuto = 0;
        let pending: number | null = null;

        const trigger = () => {
            const now = Date.now();
            const since = now - lastAuto;
            const delay = Math.max(0, AUTO_INTERVAL_MS - since);
            if (pending !== null) return;
            pending = window.setTimeout(() => {
                pending = null;
                lastAuto = Date.now();
                snapshot(true, `Auto · ${new Date().toLocaleString()}`);
            }, delay);
        };

        const onUpdate = (_update: Uint8Array, origin: unknown) => {
            // Only auto-snapshot in response to local edits, not remote sync
            if (origin === null || origin === undefined) return;
            trigger();
        };

        doc.on('update', onUpdate);
        return () => {
            doc.off('update', onUpdate);
            if (pending !== null) window.clearTimeout(pending);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [doc]);

    const restore = (v: VersionSnapshot) => {
        if (!editor) {
            onToast?.('Editor not ready.', 'error');
            return;
        }
        if (
            !window.confirm(
                `Restore "${v.label}"?\n\nThis writes the snapshot's content as a new edit on the live document. The history is preserved (you can snapshot the current state first).`,
            )
        )
            return;
        const json = jsonFromSnapshot(v);
        editor.commands.setContent(json, true);
        onToast?.(`Restored: ${v.label}`, 'success');
    };

    const diffWithCurrent = (v: VersionSnapshot) => {
        if (!editor) return;
        const olderJson = jsonFromSnapshot(v);
        const newerJson = editor.getJSON() as JSONNode;
        setDiff({
            diffJson: buildDiffDoc(olderJson, newerJson),
            olderJson,
            newerJson,
            olderLabel: v.label,
            newerLabel: 'Current',
            restoreFn: () => {
                restore(v);
                setDiff(null);
            },
        });
    };

    const startCompare = (v: VersionSnapshot) => {
        setCompareSrc(v.id);
    };

    const finishCompare = (b: VersionSnapshot) => {
        if (!compareSrc) return;
        const a = versions.find((x) => x.id === compareSrc);
        setCompareSrc(null);
        if (!a || a.id === b.id) return;
        const [older, newer] = a.createdAt <= b.createdAt ? [a, b] : [b, a];
        const olderJson = jsonFromSnapshot(older);
        const newerJson = jsonFromSnapshot(newer);
        setDiff({
            diffJson: buildDiffDoc(olderJson, newerJson),
            olderJson,
            newerJson,
            olderLabel: older.label,
            newerLabel: newer.label,
            restoreFn: () => {
                restore(older);
                setDiff(null);
            },
        });
    };

    const remove = (id: string) => {
        setVersions((vs) => vs.filter((v) => v.id !== id));
        if (compareSrc === id) setCompareSrc(null);
    };

    return (
        <>
            <div className="sidebar versions-panel">
                <div className="sidebar-title">Versions</div>
                <div className="version-create">
                    <input
                        type="text"
                        placeholder="Snapshot label (optional)"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                    />
                    <button type="button" onClick={() => snapshot(false)}>
            Save snapshot
                    </button>
                </div>
                {compareSrc && (
                    <div className="compare-banner">
            Pick a second snapshot to diff against{' '}
                        <strong>{versions.find((v) => v.id === compareSrc)?.label}</strong>{' '}
                        <button type="button" onClick={() => setCompareSrc(null)}>
              cancel
                        </button>
                    </div>
                )}
                {versions.length === 0 ? (
                    <div className="sidebar-empty">No snapshots yet.</div>
                ) : (
                    versions.map((v) => {
                        const isCompareSrc = compareSrc === v.id;
                        const inCompareTarget = compareSrc !== null && !isCompareSrc;
                        return (
                            <div
                                key={v.id}
                                className={`version${isCompareSrc ? ' is-compare-src' : ''}${
                                    inCompareTarget ? ' is-compare-target' : ''
                                }${v.auto ? ' is-auto' : ''}`}
                            >
                                <div className="version-label">
                                    {v.auto && <span className="auto-badge">auto</span>}
                                    {v.label}
                                </div>
                                <div className="version-meta">
                                    {v.authorName} · {new Date(v.createdAt).toLocaleString()}
                                </div>
                                <div className="version-actions">
                                    {inCompareTarget ? (
                                        <button type="button" onClick={() => finishCompare(v)}>
                      Diff with selected
                                        </button>
                                    ) : (
                                        <>
                                            <button type="button" onClick={() => diffWithCurrent(v)}>
                        Diff vs current
                                            </button>
                                            <button type="button" onClick={() => startCompare(v)}>
                        Compare ↔
                                            </button>
                                            <button type="button" onClick={() => restore(v)}>
                        Restore
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-danger"
                                                onClick={() => remove(v.id)}
                                            >
                        Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            {diff && (
                <VersionDiffModal
                    diffJson={diff.diffJson}
                    olderJson={diff.olderJson}
                    newerJson={diff.newerJson}
                    olderLabel={diff.olderLabel}
                    newerLabel={diff.newerLabel}
                    onClose={() => setDiff(null)}
                    onRestore={diff.restoreFn}
                />
            )}
        </>
    );
}

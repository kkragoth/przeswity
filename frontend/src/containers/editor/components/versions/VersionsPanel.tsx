import { useCallback, useState } from 'react';
import type { Editor } from '@tiptap/react';
import * as Y from 'yjs';

import type { User } from '@/editor/identity/types';
import type { VersionSnapshot } from '@/editor/versions/types';
import type { JSONNode } from '@/editor/versions/diffDoc';
import { VersionDiffModal } from '@/containers/editor/components/versions/VersionDiffModal';
import { VersionsList } from '@/containers/editor/components/versions/VersionsList';
import { useAutoSnapshot } from '@/containers/editor/hooks/useAutoSnapshot';
import { useVersions } from '@/containers/editor/hooks/useVersions';

interface VersionsPanelProps {
    doc: Y.Doc;
    user: User;
    editor: Editor | null;
    bookId: string;
    onToast?: (msg: string, kind?: 'info' | 'success' | 'error') => void;
}

export function VersionsPanel({ doc, user, editor, bookId, onToast }: VersionsPanelProps) {
    const versionsApi = useVersions(doc, user, editor, bookId);
    const [compareSourceId, setCompareSourceId] = useState<string | null>(null);
    const [diffState, setDiffState] = useState<{
        diffJson: JSONNode;
        olderJson?: JSONNode;
        newerJson?: JSONNode;
        olderLabel: string;
        newerLabel: string;
        restoreSnapshot?: VersionSnapshot;
    } | null>(null);

    useAutoSnapshot(
        doc,
        useCallback(() => {
            versionsApi.snapshot(true, `Auto · ${new Date().toLocaleString()}`);
        }, [versionsApi]),
    );

    const confirmRestore = (snapshot: VersionSnapshot) => {
        if (!editor) {
            onToast?.('Editor not ready.', 'error');
            return;
        }
        if (!window.confirm(`Restore "${snapshot.label}"?`)) return;
        if (versionsApi.restore(snapshot)) onToast?.(`Restored: ${snapshot.label}`, 'success');
    };

    return (
        <>
            <div className="sidebar versions-panel">
                <div className="sidebar-title">Versions</div>
                <div className="version-create">
                    <input
                        type="text"
                        placeholder="Snapshot label (optional)"
                        value={versionsApi.label}
                        onChange={(e) => versionsApi.setLabel(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            const saved = versionsApi.snapshot(false);
                            onToast?.(`Snapshot saved: ${saved.label}`, 'success');
                        }}
                    >
                        Save snapshot
                    </button>
                </div>

                {compareSourceId ? (
                    <div className="compare-banner">
                        Pick a second snapshot to diff against{' '}
                        <strong>{versionsApi.versions.find((v) => v.id === compareSourceId)?.label}</strong>{' '}
                        <button type="button" onClick={() => setCompareSourceId(null)}>cancel</button>
                    </div>
                ) : null}

                {versionsApi.versions.length === 0 ? (
                    <div className="sidebar-empty">No snapshots yet.</div>
                ) : (
                    <VersionsList
                        versions={versionsApi.versions}
                        compareSourceId={compareSourceId}
                        onDiffCurrent={(snapshot) => {
                            const diff = versionsApi.diffWithCurrent(snapshot);
                            if (!diff) return;
                            setDiffState({ ...diff, restoreSnapshot: snapshot });
                        }}
                        onStartCompare={(snapshot) => setCompareSourceId(snapshot.id)}
                        onDiffWithSelected={(snapshot) => {
                            if (!compareSourceId) return;
                            const source = versionsApi.versions.find((v) => v.id === compareSourceId);
                            setCompareSourceId(null);
                            if (!source || source.id === snapshot.id) return;
                            setDiffState(versionsApi.diffBetween(source, snapshot));
                        }}
                        onRestore={confirmRestore}
                        onDelete={(snapshot) => {
                            versionsApi.remove(snapshot.id);
                            if (compareSourceId === snapshot.id) setCompareSourceId(null);
                        }}
                    />
                )}
            </div>

            {diffState ? (
                <VersionDiffModal
                    diffJson={diffState.diffJson}
                    olderJson={diffState.olderJson}
                    newerJson={diffState.newerJson}
                    olderLabel={diffState.olderLabel}
                    newerLabel={diffState.newerLabel}
                    onClose={() => setDiffState(null)}
                    onRestore={diffState.restoreSnapshot ? () => confirmRestore(diffState.restoreSnapshot!) : undefined}
                />
            ) : null}
        </>
    );
}

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
import * as Y from 'yjs';

import type { User } from '@/editor/identity/types';
import type { VersionSnapshot } from '@/editor/versions/types';
import type { JSONNode } from '@/editor/versions/diffDoc';
import { VersionDiffModal } from '@/containers/editor/components/versions/VersionDiffModal';
import { VersionsList } from '@/containers/editor/components/versions/VersionsList';
import { useAutoSnapshot } from '@/containers/editor/hooks/useAutoSnapshot';
import { useVersions } from '@/containers/editor/hooks/useVersions';
import { useConfirmDialog } from '@/components/feedback/useConfirmDialog';
import { ConfirmDialogHost } from '@/components/feedback/ConfirmDialogHost';

interface VersionsPanelProps {
    doc: Y.Doc;
    user: User;
    editor: Editor | null;
    bookId: string;
    onToast?: (msg: string, kind?: 'info' | 'success' | 'error') => void;
}

export function VersionsPanel({ doc, user, editor, bookId, onToast }: VersionsPanelProps) {
    const { t } = useTranslation('editor');
    const versionsApi = useVersions(doc, user, editor, bookId);
    const confirmDlg = useConfirmDialog();
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
            versionsApi.snapshot(true, t('versions.autoLabel', { time: new Date().toLocaleString() }));
        }, [versionsApi, t]),
    );

    const confirmRestore = async (snapshot: VersionSnapshot) => {
        if (!editor) {
            onToast?.(t('versions.editorNotReady'), 'error');
            return;
        }
        const ok = await confirmDlg.confirm({
            title: t('versions.restoreConfirm', { label: snapshot.label }),
            destructive: true,
        });
        if (!ok) return;
        if (versionsApi.restore(snapshot)) onToast?.(t('versions.restoreSuccess', { label: snapshot.label }), 'success');
    };

    const compareSourceLabel = versionsApi.versions.find((v) => v.id === compareSourceId)?.label ?? '';

    return (
        <>
            <div className="sidebar versions-panel">
                <div className="sidebar-title">{t('pane.versions')}</div>
                <div className="version-create">
                    <input
                        type="text"
                        placeholder={t('versions.labelPlaceholder')}
                        value={versionsApi.label}
                        onChange={(e) => versionsApi.setLabel(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            const saved = versionsApi.snapshot(false);
                            onToast?.(t('versions.snapshotSaved', { label: saved.label }), 'success');
                        }}
                    >
                        {t('versions.createSnapshot')}
                    </button>
                </div>

                {compareSourceId ? (
                    <div className="compare-banner">
                        {t('versions.compareBanner', { label: compareSourceLabel })}{' '}
                        <button type="button" onClick={() => setCompareSourceId(null)}>{t('global.cancel')}</button>
                    </div>
                ) : null}

                {versionsApi.versions.length === 0 ? (
                    <div className="sidebar-empty">{t('versions.empty')}</div>
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
                        onRestore={(snapshot) => void confirmRestore(snapshot)}
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
                    onRestore={diffState.restoreSnapshot ? () => void confirmRestore(diffState.restoreSnapshot!) : undefined}
                />
            ) : null}

            <ConfirmDialogHost
                dialogState={confirmDlg.dialogState}
                onConfirm={confirmDlg.onConfirm}
                onCancel={confirmDlg.onCancel}
            />
        </>
    );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Editor } from '@tiptap/react';

import {
    bookSnapshotsListOptions,
    bookSnapshotCreateMutation,
    bookSnapshotDeleteMutation,
} from '@/api/generated/@tanstack/react-query.gen';
import { VersionsPanelHeader } from './components/VersionsPanelHeader';
import { useVersionNavigation } from './hooks/useVersionNavigation';
import { CURRENT_SIDE, snapshotSide } from '@/containers/editor/session/editorViewStore';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { ToastKind } from '@/editor/shell/useToast';
import type { SnapshotSummary } from '@/api/generated/types.gen';

interface VersionsPanelProps {
    editor: Editor | null;
}

export function VersionsPanel({ editor: _editor }: VersionsPanelProps) {
    const { t } = useTranslation('editor');
    const { bookId, toast } = useEditorSession();
    const [label, setLabel] = useState('');
    const queryClient = useQueryClient();
    const { openCompare } = useVersionNavigation();

    const { data: snapshots = [] } = useQuery(bookSnapshotsListOptions({ path: { bookId } }));

    const createMut = useMutation({
        ...bookSnapshotCreateMutation(),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['bookSnapshotsList'] });
            setLabel('');
        },
    });

    const deleteMut = useMutation({
        ...bookSnapshotDeleteMutation(),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['bookSnapshotsList'] });
        },
    });

    const onCreate = () => {
        const snapshotLabel = label.trim() || `Snapshot ${new Date().toLocaleString()}`;
        createMut.mutate(
            { path: { bookId }, body: { label: snapshotLabel } },
            {
                onSuccess: (snap) => toast(t('versions.snapshotSaved', { label: snap.label }), ToastKind.Success),
                onError: () => toast(t('versions.editorNotReady'), ToastKind.Error),
            },
        );
    };

    const onDelete = (snap: SnapshotSummary) => {
        deleteMut.mutate({ path: { bookId, id: snap.id } });
    };

    return (
        <div className="sidebar versions-panel">
            <VersionsPanelHeader
                label={label}
                onLabelChange={setLabel}
                onCreate={onCreate}
            />

            {snapshots.length === 0 ? (
                <div className="sidebar-empty">{t('versions.empty')}</div>
            ) : (
                snapshots.map((snap) => (
                    <div key={snap.id} className="version">
                        <div className="version-head">
                            <div className="version-head-text">
                                <div className="version-label">
                                    {snap.label.startsWith('auto:') ? (
                                        <><span className="auto-badge">{t('versions.autoBadge')}</span>{snap.label.slice(5)}</>
                                    ) : snap.label}
                                </div>
                                <div className="version-meta">
                                    {snap.createdBy.name} · {new Date(snap.createdAt).toLocaleString()}
                                </div>
                            </div>
                        </div>
                        <div className="version-actions">
                            <button type="button" className="version-primary" onClick={() => openCompare(snapshotSide(snap.id), CURRENT_SIDE)}>
                                {t('versions.compare')}
                            </button>
                            <button
                                type="button"
                                className="version-primary"
                                onClick={() => onDelete(snap)}
                                style={{ color: 'var(--warning)' }}
                            >
                                {t('versions.delete')}
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

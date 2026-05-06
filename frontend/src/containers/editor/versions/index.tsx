import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal } from 'lucide-react';
import type { Editor } from '@tiptap/react';

import {
    bookSnapshotsListOptions,
    bookSnapshotCreateMutation,
    bookSnapshotDeleteMutation,
} from '@/api/generated/@tanstack/react-query.gen';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { VersionsPanelHeader } from './components/VersionsPanelHeader';
import { SnapshotList } from './components/SnapshotList';
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

    const handleCompare = (snap: SnapshotSummary) => {
        openCompare(snapshotSide(snap.id), CURRENT_SIDE);
    };

    const handleDelete = (snap: SnapshotSummary) => {
        deleteMut.mutate({ path: { bookId, id: snap.id } });
    };

    const renderActions = (snap: SnapshotSummary) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="vh-rail-row-kebab"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={t('versions.snapshot')}
                >
                    <MoreHorizontal size={14} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4}>
                <DropdownMenuItem onClick={() => handleCompare(snap)}>
                    {t('versions.compare')}
                </DropdownMenuItem>
                <DropdownMenuItem className="is-danger" onClick={() => handleDelete(snap)}>
                    {t('versions.delete')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <div className="sidebar versions-panel">
            <VersionsPanelHeader
                label={label}
                onLabelChange={setLabel}
                onCreate={onCreate}
            />
            <SnapshotList
                snapshots={snapshots}
                onRowClick={handleCompare}
                rowActions={renderActions}
                className="vh-rail--panel"
                rowTitle={t('versions.compare')}
            />
        </div>
    );
}

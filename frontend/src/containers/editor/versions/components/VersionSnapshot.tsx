import { useTranslation } from 'react-i18next';
import { GitCompareArrows, MoreHorizontal, RotateCcw, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { VersionSnapshot as VersionSnapshotType } from '@/editor/versions/types';

interface VersionSnapshotProps {
    snapshot: VersionSnapshotType;
    isCompareSource: boolean;
    isCompareTarget: boolean;
    onDiffCurrent: () => void;
    onStartCompare: () => void;
    onDiffWithSelected: () => void;
    onRestore: () => void;
    onDelete: () => void;
}

export function VersionSnapshot(props: VersionSnapshotProps) {
    const { t } = useTranslation('editor');
    const s = props.snapshot;
    const className = [
        'version',
        props.isCompareSource ? 'is-compare-src' : '',
        props.isCompareTarget ? 'is-compare-target' : '',
        s.auto ? 'is-auto' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={className}>
            <div className="version-head">
                <div className="version-head-text">
                    <div className="version-label">
                        {s.auto ? <span className="auto-badge">{t('versions.autoBadge')}</span> : null}
                        {s.label}
                    </div>
                    <div className="version-meta">
                        {s.authorName} · {new Date(s.createdAt).toLocaleString()}
                    </div>
                </div>
                {!props.isCompareTarget ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="version-kebab"
                                aria-label={t('versions.snapshot')}
                            >
                                <MoreHorizontal size={14} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" sideOffset={4}>
                            <DropdownMenuItem onClick={props.onStartCompare}>
                                <GitCompareArrows size={14} />
                                {t('versions.compareWith')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={props.onRestore}>
                                <RotateCcw size={14} />
                                {t('versions.restore')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={props.onDelete} className="is-danger">
                                <Trash2 size={14} />
                                {t('versions.delete')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : null}
            </div>
            <button
                type="button"
                className="version-primary"
                onClick={props.isCompareTarget ? props.onDiffWithSelected : props.onDiffCurrent}
            >
                {props.isCompareTarget ? t('versions.diffWithSelected') : t('versions.diffVsCurrent')}
            </button>
        </div>
    );
}

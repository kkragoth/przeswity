import { useTranslation } from 'react-i18next';
import { CheckCheck, X, Users } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface AuthorOption {
    id: string;
    name: string;
}

interface ThreadsBulkBarProps {
    visibleCount: number;
    canBulkResolve: boolean;
    canBulkAcceptReject: boolean;
    authors: AuthorOption[];
    activeAuthorId: string | null;
    onAuthorChange: (id: string | null) => void;
    onResolveAll: () => void;
    onAcceptAll: () => void;
    onRejectAll: () => void;
}

export function ThreadsBulkBar({
    visibleCount,
    canBulkResolve,
    canBulkAcceptReject,
    authors,
    activeAuthorId,
    onAuthorChange,
    onResolveAll,
    onAcceptAll,
    onRejectAll,
}: ThreadsBulkBarProps) {
    const { t } = useTranslation('editor');
    if (visibleCount === 0 && !activeAuthorId) return null;
    const activeAuthorName = authors.find((a) => a.id === activeAuthorId)?.name;
    return (
        <div className="threads-bulk-bar">
            <span className="threads-bulk-count">
                {t('threads.bulk.visibleCount', { count: visibleCount })}
            </span>
            <div className="threads-bulk-spacer" />
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button
                        type="button"
                        className={`threads-bulk-btn${activeAuthorId ? ' is-active' : ''}`}
                        title={t('threads.bulk.filterByAuthor')}
                        aria-label={t('threads.bulk.filterByAuthor')}
                    >
                        <Users size={12} />
                        <span>{activeAuthorName ?? t('threads.bulk.allAuthors')}</span>
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content align="end" sideOffset={4} className="topbar-dropdown-content">
                        <DropdownMenu.Item className="topbar-dropdown-item" onSelect={() => onAuthorChange(null)}>
                            {t('threads.bulk.allAuthors')}
                        </DropdownMenu.Item>
                        {authors.map((a) => (
                            <DropdownMenu.Item
                                key={a.id}
                                className="topbar-dropdown-item"
                                onSelect={() => onAuthorChange(a.id)}
                            >
                                {a.name}
                            </DropdownMenu.Item>
                        ))}
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>
            {canBulkAcceptReject && (
                <>
                    <button
                        type="button"
                        className="threads-bulk-btn threads-bulk-btn--accept"
                        onClick={onAcceptAll}
                        disabled={visibleCount === 0}
                        title={t('threads.bulk.acceptAll')}
                    >
                        <CheckCheck size={12} />
                        <span>{t('threads.bulk.acceptAll')}</span>
                    </button>
                    <button
                        type="button"
                        className="threads-bulk-btn threads-bulk-btn--reject"
                        onClick={onRejectAll}
                        disabled={visibleCount === 0}
                        title={t('threads.bulk.rejectAll')}
                    >
                        <X size={12} />
                        <span>{t('threads.bulk.rejectAll')}</span>
                    </button>
                </>
            )}
            {canBulkResolve && (
                <button
                    type="button"
                    className="threads-bulk-btn threads-bulk-btn--resolve"
                    onClick={onResolveAll}
                    disabled={visibleCount === 0}
                    title={t('threads.bulk.resolveAll')}
                >
                    <CheckCheck size={12} />
                    <span>{t('threads.bulk.resolveAll')}</span>
                </button>
            )}
        </div>
    );
}

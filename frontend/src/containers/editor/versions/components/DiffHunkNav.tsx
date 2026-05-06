import { ChevronUp, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DiffHunkNavProps {
    total: number
    active: number
    onPrev: () => void
    onNext: () => void
}

export function DiffHunkNav({ total, active, onPrev, onNext }: DiffHunkNavProps) {
    const { t } = useTranslation('editor');
    if (total === 0) return null;
    return (
        <div className="diff-hunk-nav">
            <button
                type="button"
                className="diff-hunk-nav-btn"
                onClick={onPrev}
                disabled={active === 0}
                title={t('versions.hunkPrev')}
            >
                <ChevronUp size={14} />
            </button>
            <span className="diff-hunk-counter">{active + 1} / {total}</span>
            <button
                type="button"
                className="diff-hunk-nav-btn"
                onClick={onNext}
                disabled={active >= total - 1}
                title={t('versions.hunkNext')}
            >
                <ChevronDown size={14} />
            </button>
        </div>
    );
}

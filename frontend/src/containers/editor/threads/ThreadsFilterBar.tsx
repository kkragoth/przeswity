import { useTranslation } from 'react-i18next';
import { ThreadFilterKind } from './types';

interface ThreadsFilterBarProps {
    active: ThreadFilterKind;
    onChange: (f: ThreadFilterKind) => void;
}

type FilterDef = { id: ThreadFilterKind; label: 'threads.filter.all' | 'threads.filter.open' | 'threads.filter.resolved' | 'threads.filter.suggestions' | 'threads.filter.mine' };

const FILTERS: FilterDef[] = [
    { id: ThreadFilterKind.All, label: 'threads.filter.all' },
    { id: ThreadFilterKind.Open, label: 'threads.filter.open' },
    { id: ThreadFilterKind.Resolved, label: 'threads.filter.resolved' },
    { id: ThreadFilterKind.SuggestionsOnly, label: 'threads.filter.suggestions' },
    { id: ThreadFilterKind.Mine, label: 'threads.filter.mine' },
];

export function ThreadsFilterBar({ active, onChange }: ThreadsFilterBarProps) {
    const { t } = useTranslation('editor');
    return (
        <div className="threads-filter-bar">
            {FILTERS.map(({ id, label }) => (
                <button
                    key={id}
                    type="button"
                    className={`threads-filter-chip${active === id ? ' is-active' : ''}`}
                    onClick={() => onChange(id)}
                >
                    {t(label)}
                </button>
            ))}
        </div>
    );
}

import { useTranslation } from 'react-i18next';
import type { Participant } from '../store/commentsSelectors';

interface AuthorChipsProps {
    participants: Participant[]
    activeId: string
    onSelect: (id: string) => void
}

export function AuthorChips({ participants, activeId, onSelect }: AuthorChipsProps) {
    const { t } = useTranslation('editor');
    if (participants.length === 0) return null;
    return (
        <div className="author-chips">
            <button
                type="button"
                className={`author-chip${activeId === '' ? ' is-active' : ''}`}
                onClick={() => onSelect('')}
            >
                {t('comments.filter.allAuthors')}
            </button>
            {participants.map((p) => (
                <button
                    key={p.id}
                    type="button"
                    className={`author-chip${activeId === p.id ? ' is-active' : ''}`}
                    onClick={() => onSelect(p.id)}
                    style={{ '--chip-color': p.color } as React.CSSProperties}
                >
                    <span className="author-chip-dot" />
                    {p.name}
                </button>
            ))}
        </div>
    );
}

import { useTranslation } from 'react-i18next';
import { SuggestionType } from '@/editor/suggestions/suggestionOps';

export interface SuggestionEntry {
    type: SuggestionType
    suggestionId: string
    authorId: string
    authorName: string
    authorColor: string
    timestamp: number
    text: string
    from: number
    to: number
}

interface SuggestionItemProps {
    entry: SuggestionEntry
    canResolve: boolean
    onSelect: (entry: SuggestionEntry) => void
    onAccept: (entry: SuggestionEntry) => void
    onReject: (entry: SuggestionEntry) => void
}

export function SuggestionItem({ entry, canResolve, onSelect, onAccept, onReject }: SuggestionItemProps) {
    const { t } = useTranslation('editor');
    return (
        <div
            className={`suggestion suggestion-${entry.type}`}
            style={{ borderLeftColor: entry.authorColor }}
            onClick={() => onSelect(entry)}
        >
            <div className="suggestion-meta">
                <span style={{ color: entry.authorColor }}>● {entry.authorName}</span>
                <span className="suggestion-type">
                    {entry.type === SuggestionType.Insertion ? t('suggestions.inserted') : t('suggestions.deleted')}
                </span>
                <span className="suggestion-time">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
            </div>
            <div className={`suggestion-text suggestion-text-${entry.type}`}>{entry.text}</div>
            {canResolve && (
                <div className="suggestion-actions">
                    <button
                        type="button"
                        onClick={(ev) => { ev.stopPropagation(); onAccept(entry); }}
                    >
                        {t('suggestions.accept')}
                    </button>
                    <button
                        type="button"
                        onClick={(ev) => { ev.stopPropagation(); onReject(entry); }}
                    >
                        {t('suggestions.reject')}
                    </button>
                </div>
            )}
        </div>
    );
}

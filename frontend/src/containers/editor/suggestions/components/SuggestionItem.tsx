import { useTranslation } from 'react-i18next';

export enum SuggestionEntryKind {
    Insert = 'insert',
    Delete = 'delete',
    Replace = 'replace',
}

interface SuggestionEntryBase {
    suggestionId: string
    authorId: string
    authorName: string
    authorColor: string
    timestamp: number
}

export type SuggestionEntry =
  | (SuggestionEntryBase & { kind: SuggestionEntryKind.Insert; text: string; from: number; to: number })
  | (SuggestionEntryBase & { kind: SuggestionEntryKind.Delete; text: string; from: number; to: number })
  | (SuggestionEntryBase & {
      kind: SuggestionEntryKind.Replace
      deletedText: string
      insertedText: string
      deletedFrom: number
      deletedTo: number
      insertedFrom: number
      insertedTo: number
    })

interface SuggestionItemProps {
    entry: SuggestionEntry
    canResolve: boolean
    onSelect: (entry: SuggestionEntry) => void
    onAccept: (entry: SuggestionEntry) => void
    onReject: (entry: SuggestionEntry) => void
}

function SuggestionBody({ entry }: { entry: SuggestionEntry }) {
    if (entry.kind === SuggestionEntryKind.Replace) {
        return (
            <div className="suggestion-text suggestion-text-replace">
                <span className="suggestion-text-deletion">{entry.deletedText}</span>
                <span className="suggestion-text-arrow"> → </span>
                <span className="suggestion-text-insertion">{entry.insertedText}</span>
            </div>
        );
    }
    return (
        <div className={`suggestion-text suggestion-text-${entry.kind}`}>{entry.text}</div>
    );
}

export function SuggestionItem({ entry, canResolve, onSelect, onAccept, onReject }: SuggestionItemProps) {
    const { t } = useTranslation('editor');
    const label = entry.kind === SuggestionEntryKind.Insert
        ? t('suggestions.inserted')
        : entry.kind === SuggestionEntryKind.Delete
            ? t('suggestions.deleted')
            : t('suggestions.replaced');
    return (
        <div
            className={`suggestion suggestion-${entry.kind}`}
            style={{ borderLeftColor: entry.authorColor }}
            onClick={() => onSelect(entry)}
        >
            <div className="suggestion-meta">
                <span style={{ color: entry.authorColor }}>● {entry.authorName}</span>
                <span className="suggestion-type">{label}</span>
                <span className="suggestion-time">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
            </div>
            <SuggestionBody entry={entry} />
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

import { useTranslation } from 'react-i18next';

export enum SuggestionEntryKind {
    Insert = 'insert',
    Delete = 'delete',
    Replace = 'replace',
    Format = 'format',
}

interface SuggestionEntryBase {
    suggestionId: string
    authorId: string
    authorName: string
    authorColor: string
    timestamp: number
}

export type FormatSummary =
    | { kind: 'mark-add'; markName: string }
    | { kind: 'mark-remove'; markName: string }
    | { kind: 'node-attr'; attr: string; from: unknown; to: unknown }
    | { kind: 'multi'; count: number }

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
  | (SuggestionEntryBase & { kind: SuggestionEntryKind.Format; from: number; to: number; summary: FormatSummary })

interface SuggestionItemProps {
    entry: SuggestionEntry
    canResolve: boolean
    onSelect: (entry: SuggestionEntry) => void
    onAccept: (entry: SuggestionEntry) => void
    onReject: (entry: SuggestionEntry) => void
}

function FormatBody({ summary }: { summary: FormatSummary }) {
    const { t } = useTranslation('editor');
    if (summary.kind === 'mark-add') {
        return <div className="suggestion-text suggestion-text-format">{t('suggestions.format.markAdded', { mark: summary.markName })}</div>;
    }
    if (summary.kind === 'mark-remove') {
        return <div className="suggestion-text suggestion-text-format">{t('suggestions.format.markRemoved', { mark: summary.markName })}</div>;
    }
    if (summary.kind === 'node-attr') {
        return <div className="suggestion-text suggestion-text-format">{t('suggestions.format.nodeAttrChanged', { attr: summary.attr, from: String(summary.from), to: String(summary.to) })}</div>;
    }
    return <div className="suggestion-text suggestion-text-format">{t('suggestions.format.multiChanges', { count: summary.count })}</div>;
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
    if (entry.kind === SuggestionEntryKind.Format) {
        return <FormatBody summary={entry.summary} />;
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
            : entry.kind === SuggestionEntryKind.Format
                ? t('suggestions.format.label')
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

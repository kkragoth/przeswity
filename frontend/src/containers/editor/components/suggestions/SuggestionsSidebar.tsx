import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';
import type { User } from '@/editor/identity/types';
import { ROLE_PERMISSIONS } from '@/editor/identity/types';
import { acceptSuggestion, rejectSuggestion, SuggestionType } from '@/editor/suggestions/suggestionOps';

interface SuggestionEntry {
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

interface SuggestionsSidebarProps {
  editor: Editor | null
  user: User
}

function collectSuggestions(editor: Editor): SuggestionEntry[] {
    const out: SuggestionEntry[] = [];
    const seen = new Map<string, SuggestionEntry>();
    editor.state.doc.descendants((node, pos) => {
        if (!node.isText) return;
        for (const mark of node.marks) {
            if (mark.type.name !== SuggestionType.Insertion && mark.type.name !== SuggestionType.Deletion) continue;
            const id = mark.attrs.suggestionId as string;
            const existing = seen.get(id);
            if (existing) {
                existing.to = pos + node.nodeSize;
                existing.text += node.text ?? '';
            } else {
                const entry: SuggestionEntry = {
                    type: mark.type.name as SuggestionType,
                    suggestionId: id,
                    authorId: mark.attrs.authorId,
                    authorName: mark.attrs.authorName,
                    authorColor: mark.attrs.authorColor,
                    timestamp: mark.attrs.timestamp,
                    text: node.text ?? '',
                    from: pos,
                    to: pos + node.nodeSize,
                };
                out.push(entry);
                seen.set(id, entry);
            }
        }
    });
    return out;
}

export function SuggestionsSidebar({ editor, user }: SuggestionsSidebarProps) {
    const { t } = useTranslation('editor');
    const [entries, setEntries] = useState<SuggestionEntry[]>([]);
    const perms = ROLE_PERMISSIONS[user.role];

    useEffect(() => {
        if (!editor) return;
        const update = () => setEntries(collectSuggestions(editor));
        update();
        editor.on('update', update);
        editor.on('transaction', update);
        return () => {
            editor.off('update', update);
            editor.off('transaction', update);
        };
    }, [editor]);

    if (!editor) return null;

    const accept = (e: SuggestionEntry) => {
        if (!perms.canResolveSuggestion) return;
        acceptSuggestion(editor, e.suggestionId, e.type);
    };

    const reject = (e: SuggestionEntry) => {
        if (!perms.canResolveSuggestion) return;
        rejectSuggestion(editor, e.suggestionId, e.type);
    };

    const acceptAll = () => entries.forEach(accept);
    const rejectAll = () => entries.forEach(reject);

    return (
        <div className="sidebar suggestions-sidebar">
            <div className="sidebar-title">{t('suggestions.sidebarTitle', { count: entries.length })}</div>
            {entries.length === 0 ? (
                <div className="sidebar-empty">{t('suggestions.empty')}</div>
            ) : (
                <>
                    {perms.canResolveSuggestion && (
                        <div className="bulk-actions">
                            <button type="button" onClick={acceptAll}>
                                {t('suggestions.acceptAll')}
                            </button>
                            <button type="button" onClick={rejectAll}>
                                {t('suggestions.rejectAll')}
                            </button>
                        </div>
                    )}
                    {entries.map((e) => (
                        <div
                            key={e.suggestionId}
                            className={`suggestion suggestion-${e.type}`}
                            style={{ borderLeftColor: e.authorColor }}
                            onClick={() => {
                                editor.chain().focus().setTextSelection({ from: e.from, to: e.to }).run();
                            }}
                        >
                            <div className="suggestion-meta">
                                <span style={{ color: e.authorColor }}>● {e.authorName}</span>
                                <span className="suggestion-type">
                                    {e.type === SuggestionType.Insertion ? t('suggestions.inserted') : t('suggestions.deleted')}
                                </span>
                                <span className="suggestion-time">
                                    {new Date(e.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                            <div className={`suggestion-text suggestion-text-${e.type}`}>{e.text}</div>
                            {perms.canResolveSuggestion && (
                                <div className="suggestion-actions">
                                    <button
                                        type="button"
                                        onClick={(ev) => {
                                            ev.stopPropagation();
                                            accept(e);
                                        }}
                                    >
                                        {t('suggestions.accept')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(ev) => {
                                            ev.stopPropagation();
                                            reject(e);
                                        }}
                                    >
                                        {t('suggestions.reject')}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}

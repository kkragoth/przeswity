import { useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';
import {
    acceptSuggestion,
    rejectSuggestion,
    acceptFormatChange,
    rejectFormatChange,
    SuggestionType,
} from '@/editor/suggestions/suggestionOps';
import { collectFormatChanges } from '@/editor/suggestions/collectFormatChanges';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useToast } from '@/editor/shell/useToast';
import { AuthorChips } from '@/containers/editor/comments/components/AuthorChips';
import type { Participant } from '@/containers/editor/comments/store/commentsSelectors';
import {
    SuggestionEntryKind,
    SuggestionItem,
    type SuggestionEntry,
} from './components/SuggestionItem';

interface SuggestionsSidebarProps {
  editor: Editor | null
}

interface MarkSide {
    text: string
    from: number
    to: number
}

interface SuggestionGroup {
    suggestionId: string
    authorId: string
    authorName: string
    authorColor: string
    timestamp: number
    earliestPos: number
    insertion: MarkSide | null
    deletion: MarkSide | null
}

function appendSide(side: MarkSide | null, pos: number, node: { nodeSize: number; text?: string }): MarkSide {
    if (!side) return { text: node.text ?? '', from: pos, to: pos + node.nodeSize };
    side.text += node.text ?? '';
    side.to = pos + node.nodeSize;
    return side;
}

function collectSuggestions(editor: Editor): SuggestionEntry[] {
    const groups = new Map<string, SuggestionGroup>();
    editor.state.doc.descendants((node, pos) => {
        if (!node.isText) return;
        for (const mark of node.marks) {
            if (mark.type.name !== SuggestionType.Insertion && mark.type.name !== SuggestionType.Deletion) continue;
            const id = mark.attrs.suggestionId as string;
            let group = groups.get(id);
            if (!group) {
                group = {
                    suggestionId: id,
                    authorId: mark.attrs.authorId,
                    authorName: mark.attrs.authorName,
                    authorColor: mark.attrs.authorColor,
                    timestamp: mark.attrs.timestamp,
                    earliestPos: pos,
                    insertion: null,
                    deletion: null,
                };
                groups.set(id, group);
            }
            if (mark.type.name === SuggestionType.Insertion) group.insertion = appendSide(group.insertion, pos, node);
            else group.deletion = appendSide(group.deletion, pos, node);
        }
    });

    const out: SuggestionEntry[] = [];
    for (const g of groups.values()) {
        const base = {
            suggestionId: g.suggestionId,
            authorId: g.authorId,
            authorName: g.authorName,
            authorColor: g.authorColor,
            timestamp: g.timestamp,
        };
        if (g.insertion && g.deletion) {
            out.push({
                ...base,
                kind: SuggestionEntryKind.Replace,
                deletedText: g.deletion.text,
                insertedText: g.insertion.text,
                deletedFrom: g.deletion.from,
                deletedTo: g.deletion.to,
                insertedFrom: g.insertion.from,
                insertedTo: g.insertion.to,
            });
        } else if (g.insertion) {
            out.push({ ...base, kind: SuggestionEntryKind.Insert, text: g.insertion.text, from: g.insertion.from, to: g.insertion.to });
        } else if (g.deletion) {
            out.push({ ...base, kind: SuggestionEntryKind.Delete, text: g.deletion.text, from: g.deletion.from, to: g.deletion.to });
        }
    }
    return out;
}

function entryStart(entry: SuggestionEntry): number {
    if (entry.kind === SuggestionEntryKind.Replace) return Math.min(entry.deletedFrom, entry.insertedFrom);
    return entry.from;
}

function entryRange(entry: SuggestionEntry): { from: number; to: number } {
    if (entry.kind === SuggestionEntryKind.Replace) {
        return {
            from: Math.min(entry.deletedFrom, entry.insertedFrom),
            to: Math.max(entry.deletedTo, entry.insertedTo),
        };
    }
    return { from: entry.from, to: entry.to };
}

function allEntries(editor: Editor): SuggestionEntry[] {
    const out = [...collectSuggestions(editor), ...collectFormatChanges(editor)];
    out.sort((a, b) => entryStart(a) - entryStart(b));
    return out;
}

function entryParticipants(entries: SuggestionEntry[]): Participant[] {
    const map = new Map<string, Participant>();
    for (const e of entries) {
        if (!map.has(e.authorId)) map.set(e.authorId, { id: e.authorId, name: e.authorName, color: e.authorColor });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function SuggestionsSidebar({ editor }: SuggestionsSidebarProps) {
    const { t } = useTranslation('editor');
    const { perms } = useEditorSession();
    const { showWithUndo } = useToast();
    const [entries, setEntries] = useState<SuggestionEntry[]>([]);
    const [authorFilter, setAuthorFilter] = useState('');

    useEffect(() => {
        if (!editor) return;
        const update = () => setEntries(allEntries(editor));
        update();
        editor.on('update', update);
        editor.on('transaction', update);
        return () => {
            editor.off('update', update);
            editor.off('transaction', update);
        };
    }, [editor]);

    if (!editor) return null;

    const participants = useMemo(() => entryParticipants(entries), [entries]);
    const visible = useMemo(
        () => (authorFilter ? entries.filter((e) => e.authorId === authorFilter) : entries),
        [entries, authorFilter],
    );

    const undoEditor = () => editor.commands.undo();

    const accept = (e: SuggestionEntry) => {
        if (!perms.canResolveSuggestion) return;
        if (e.kind === SuggestionEntryKind.Format) {
            acceptFormatChange(editor, e.suggestionId);
        } else {
            acceptSuggestion(editor, e.suggestionId);
        }
        showWithUndo(t('suggestions.acceptedToast'), { label: t('suggestions.undo'), onUndo: undoEditor });
    };

    const reject = (e: SuggestionEntry) => {
        if (!perms.canResolveSuggestion) return;
        if (e.kind === SuggestionEntryKind.Format) {
            rejectFormatChange(editor, e.suggestionId);
        } else {
            rejectSuggestion(editor, e.suggestionId);
        }
        showWithUndo(t('suggestions.rejectedToast'), { label: t('suggestions.undo'), onUndo: undoEditor });
    };

    const acceptAll = () => {
        if (!visible.length) return;
        visible.forEach((e) => {
            if (!perms.canResolveSuggestion) return;
            if (e.kind === SuggestionEntryKind.Format) {
                acceptFormatChange(editor, e.suggestionId);
            } else {
                acceptSuggestion(editor, e.suggestionId);
            }
        });
        showWithUndo(t('suggestions.acceptedAllToast', { count: visible.length }), { label: t('suggestions.undo'), onUndo: undoEditor });
    };

    const rejectAll = () => {
        if (!visible.length) return;
        visible.forEach((e) => {
            if (!perms.canResolveSuggestion) return;
            if (e.kind === SuggestionEntryKind.Format) {
                rejectFormatChange(editor, e.suggestionId);
            } else {
                rejectSuggestion(editor, e.suggestionId);
            }
        });
        showWithUndo(t('suggestions.rejectedAllToast', { count: visible.length }), { label: t('suggestions.undo'), onUndo: undoEditor });
    };

    const select = (e: SuggestionEntry) => {
        const { from, to } = entryRange(e);
        editor.chain().focus().setTextSelection({ from, to }).run();
    };

    return (
        <div className="sidebar suggestions-sidebar">
            <div className="sidebar-title">{t('suggestions.sidebarTitle', { count: entries.length })}</div>
            {entries.length === 0 ? (
                <div className="sidebar-empty">{t('suggestions.empty')}</div>
            ) : (
                <>
                    <AuthorChips participants={participants} activeId={authorFilter} onSelect={setAuthorFilter} />
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
                    {visible.length === 0 ? (
                        <div className="sidebar-empty">{t('suggestions.noMatch')}</div>
                    ) : (
                        visible.map((e) => (
                            <SuggestionItem
                                key={e.suggestionId}
                                entry={e}
                                canResolve={perms.canResolveSuggestion}
                                onSelect={select}
                                onAccept={accept}
                                onReject={reject}
                            />
                        ))
                    )}
                </>
            )}
        </div>
    );
}

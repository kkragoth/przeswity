import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import type { GlossaryEntry } from './GlossaryHighlight';

interface GlossaryPanelProps {
  doc: Y.Doc
}

interface StoredEntry extends GlossaryEntry {
  id: string
  updatedAt: number
}

export function useGlossary(doc: Y.Doc): StoredEntry[] {
    const [entries, setEntries] = useState<StoredEntry[]>([]);
    useEffect(() => {
        const map = doc.getMap('glossary') as Y.Map<StoredEntry>;
        const update = () => {
            const out: StoredEntry[] = [];
            map.forEach((v) => out.push(v));
            out.sort((a, b) => a.term.localeCompare(b.term));
            setEntries(out);
        };
        update();
        map.observe(update);
        return () => map.unobserve(update);
    }, [doc]);
    return entries;
}

function makeId(): string {
    return Math.random().toString(36).slice(2, 11);
}

export function GlossaryPanel({ doc }: GlossaryPanelProps) {
    const entries = useGlossary(doc);
    const [draft, setDraft] = useState<{ term: string; translation: string; notes: string }>({
        term: '',
        translation: '',
        notes: '',
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    const map = () => doc.getMap('glossary') as Y.Map<StoredEntry>;

    const save = () => {
        const term = draft.term.trim();
        if (!term) return;
        if (editingId) {
            const e = map().get(editingId);
            if (e) {
                map().set(editingId, {
                    ...e,
                    term,
                    translation: draft.translation.trim(),
                    notes: draft.notes.trim() || undefined,
                    updatedAt: Date.now(),
                });
            }
        } else {
            const id = makeId();
            map().set(id, {
                id,
                term,
                translation: draft.translation.trim(),
                notes: draft.notes.trim() || undefined,
                updatedAt: Date.now(),
            });
        }
        setDraft({ term: '', translation: '', notes: '' });
        setEditingId(null);
    };

    const remove = (id: string) => {
        map().delete(id);
        if (editingId === id) {
            setEditingId(null);
            setDraft({ term: '', translation: '', notes: '' });
        }
    };

    const startEdit = (e: StoredEntry) => {
        setEditingId(e.id);
        setDraft({ term: e.term, translation: e.translation, notes: e.notes ?? '' });
    };

    return (
        <div className="sidebar glossary-panel">
            <div className="sidebar-title">Glossary</div>
            <div className="glossary-form">
                <input
                    type="text"
                    placeholder="Term (matched in document)"
                    value={draft.term}
                    onChange={(e) => setDraft((d) => ({ ...d, term: e.target.value }))}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') save();
                    }}
                />
                <input
                    type="text"
                    placeholder="Translation / canonical form"
                    value={draft.translation}
                    onChange={(e) => setDraft((d) => ({ ...d, translation: e.target.value }))}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') save();
                    }}
                />
                <input
                    type="text"
                    placeholder="Notes (optional)"
                    value={draft.notes}
                    onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') save();
                    }}
                />
                <div className="glossary-actions">
                    <button
                        type="button"
                        onClick={save}
                        disabled={!draft.term.trim()}
                        className="btn-primary"
                    >
                        {editingId ? 'Save' : 'Add'}
                    </button>
                    {editingId && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingId(null);
                                setDraft({ term: '', translation: '', notes: '' });
                            }}
                        >
              Cancel
                        </button>
                    )}
                </div>
            </div>
            {entries.length === 0 ? (
                <div className="sidebar-empty">No glossary entries. Add a term above to highlight it in the document.</div>
            ) : (
                entries.map((e) => (
                    <div key={e.id} className={`glossary-entry${editingId === e.id ? ' is-editing' : ''}`}>
                        <div className="glossary-row">
                            <span className="glossary-term-label">{e.term}</span>
                            <span className="glossary-arrow">→</span>
                            <span className="glossary-translation">{e.translation || '—'}</span>
                        </div>
                        {e.notes && <div className="glossary-notes">{e.notes}</div>}
                        <div className="glossary-buttons">
                            <button type="button" onClick={() => startEdit(e)}>
                Edit
                            </button>
                            <button type="button" className="btn-danger" onClick={() => remove(e.id)}>
                Delete
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
